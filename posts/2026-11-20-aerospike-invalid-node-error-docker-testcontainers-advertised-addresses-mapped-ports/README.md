# Fix Aerospike `INVALID_NODE_ERROR` in Docker and Testcontainers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Docker, Testcontainers, Java, Troubleshooting

Description: Diagnose Aerospike client discovery failures in containers by checking seed endpoints, advertised addresses, alternate services, and Docker port mappings.

An Aerospike container can be running, and its published port can accept connections, while an application still cannot find a usable node for an operation. There are two endpoints to investigate: the seed supplied by your application and the addresses learned during cluster discovery.

`INVALID_NODE_ERROR` is a client-side error. It can mean that the client has no node for the requested partition; incorrect seeds and inaccessible nodes are possible causes. It can also reflect unavailable partitions or strong-consistency configuration problems. Establish that this is a networking failure before changing addresses. [Aerospike's error explanation](https://aerospike.com/docs/database/learn/strong-consistency/) describes these distinctions.

## Compare the three endpoints

Suppose Docker publishes container port `3000` on host port `4000`:

| Endpoint | Example | Purpose |
| --- | --- | --- |
| Container listener | `172.18.0.2:3000` | Where the database accepts traffic inside Docker |
| Published endpoint | `127.0.0.1:4000` | Where an application on this host connects |
| Advertised endpoint | Returned by Aerospike | Where the client learns to find database nodes |

Aerospike clients contact a seed and discover the cluster from there. A working seed therefore does not demonstrate that every discovered node is reachable. Docker port publishing forwards traffic; it does not rewrite Aerospike's discovery responses. [Aerospike connection documentation](https://aerospike.com/docs/develop/client/java/connect/) explains the seed-and-discovery sequence.

A single-node Java test may already work with a mapped seed. The current Java client skips seed-address replacement for loopback addresses and can retain the original seed when advertised alternatives fail. Do not assume an internal advertised IP proves the cause of every failure. Peer discovery becomes especially important when additional nodes join. See the [Java client's address validation](https://github.com/aerospike/aerospike-client-java/blob/master/client/src/com/aerospike/client/cluster/NodeValidator.java).

## Inspect what the client actually receives

Run these commands from the same network environment as the application, with Aerospike Tools installed. Substitute the actual seed host and published port:

```bash
asinfo -h 127.0.0.1 -p 4000 -v 'service-clear-std'
asinfo -h 127.0.0.1 -p 4000 -v 'service-clear-alt'
asinfo -h 127.0.0.1 -p 4000 -v 'peers-clear-std'
asinfo -h 127.0.0.1 -p 4000 -v 'peers-clear-alt'
```

The `service` commands describe the contacted node; the `peers` commands describe other nodes. A standard endpoint such as `172.18.0.2:3000` may be usable inside the Docker network and inaccessible from your laptop. An alternate endpoint must include the correct external port as well as the correct address. These are the current [non-TLS discovery commands](https://aerospike.com/docs/database/reference/info/).

If even the first command cannot connect, inspect `docker port aerospike 3000/tcp`, container logs, and the seed passed to the application. Diagnose transport, authentication, or server startup failures before investigating peer addresses.

## Publish a matching alternate endpoint

For an application running on the same machine as the Docker daemon, merge this service subsection into the existing `network` block in `aerospike.conf`. Preserve the rest of your version-appropriate database configuration, including namespaces, heartbeat, and fabric settings:

```text
network {
    service {
        address any
        port 3000
        alternate-access-address 127.0.0.1
        alternate-access-port 4000
    }
}
```

`address` and `port` control the listener. The alternate fields describe the endpoint outside the container. Unlike `access-address`, an alternate address may refer to an address that is not local to the database node. These fields are static, so load the updated configuration through a server restart or container recreation. See the [configuration reference](https://aerospike.com/docs/database/reference/config/).

For example, start a separate development container using the prepared configuration and an available host port:

```bash
docker run -d --name aerospike-fixed \
  -p 127.0.0.1:4000:3000 \
  -v "$PWD/aerospike.conf:/etc/aerospike/aerospike.conf:ro" \
  aerospike/aerospike-server:7.2.0.22-14 \
  --config-file /etc/aerospike/aerospike.conf
```

This uses a published [Community Edition image tag](https://hub.docker.com/r/aerospike/aerospike-server/tags). Keep the image and configuration compatible with your existing deployment. The image supports loading a mounted file with [`--config-file`](https://github.com/aerospike/aerospike-server.docker).

Enable alternate discovery in the Java client:

```java
ClientPolicy policy = new ClientPolicy();
policy.useServicesAlternate = true;

try (AerospikeClient client =
         new AerospikeClient(policy, "127.0.0.1", 4000)) {
    // Run your existing database operations.
}
```

Import `com.aerospike.client.AerospikeClient` and `com.aerospike.client.policy.ClientPolicy`. The server configuration and client policy must agree: alternate discovery selects the alternate endpoint set; it does not create port forwarding. [Aerospike network configuration](https://aerospike.com/docs/database/manage/network/) documents this pairing.

For remote clients, replace loopback with the Docker host's reachable address and publish on the appropriate host interface. Configure every cluster node with its own reachable endpoint. Several nodes behind one host need distinct published ports.

## Use the actual Testcontainers seed

Testcontainers normally chooses a free host port. Retrieve it after startup, together with the host returned by Testcontainers; hard-coding either `localhost` or `3000` can break CI. [Testcontainers networking documentation](https://java.testcontainers.org/features/networking/) explains both APIs.

For a fresh single-node container using its default configuration, the connection setup is:

```java
import com.aerospike.client.AerospikeClient;
import org.testcontainers.containers.GenericContainer;

try (GenericContainer<?> db = new GenericContainer<>(
        "aerospike/aerospike-server:7.2.0.22-14")
        .withExposedPorts(3000)) {
    db.start();

    try (AerospikeClient client = new AerospikeClient(
            db.getHost(), db.getMappedPort(3000))) {
        // Run your existing database operations.
    }
}
```

This corrects the seed. The default `GenericContainer` wait checks for a listening port, so a robust fixture also needs a bounded readiness check that retries client connection and a database operation until initialization finishes. The snippet does not configure alternate advertisement. Do not copy the earlier `4000` advertisement into a fixture whose actual published port changes each run, or enable alternate discovery without configuring matching endpoints.

For tests requiring discovery across multiple nodes, a practical option is to run the application test container and database containers on one Testcontainers `Network`. Give each database a network alias, seed the application with that alias and internal port `3000`, and retain standard advertisement reachable on that network. No host port translation is needed between these containers. If the application must remain outside Docker, its discovered endpoints need the same host-and-port consistency demonstrated above; a custom fixture must arrange those values before starting the database process.

## Verify the repair through database operations

Repeat the discovery queries and check every returned endpoint from the application's network. Then run a write/read round trip in a configured namespace and confirm the client discovers the expected node count. A listening port alone is a weaker readiness condition than a successful database operation. [Testcontainers wait strategies](https://java.testcontainers.org/features/startup_and_waits/) distinguish port checks from application readiness.

Avoid treating Java's `ipMap` as a port translation feature: it translates addresses while retaining ports. Likewise, `forceSingleNode` bypasses partition-based routing and is marked for testing only. Neither repairs a cluster's advertised endpoints. See the [Java client policy definitions](https://github.com/aerospike/aerospike-client-java/blob/master/client/src/com/aerospike/client/policy/ClientPolicy.java).
