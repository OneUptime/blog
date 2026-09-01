# How to Configure Geode Locator and Server Bind Addresses in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Docker, Networking, Troubleshooting, Distributed Database

Description: Configure Geode's peer, locator, client-listener, and advertised addresses so containers can form a cluster and clients receive reachable server endpoints.

---

Apache Geode in Docker has more than one network identity. A locator can be reachable while the server cannot join it, and a client can reach the locator but fail when the locator returns an unroutable container hostname. Those failures come from treating bind and advertised addresses as one setting.

Design three address planes explicitly:

| Address plane | Geode setting | Who must reach it |
| --- | --- | --- |
| Peer membership and distribution | `bind-address` and `locators` | Locators and servers |
| Client listener | `server-bind-address` and `server-port` | Client TCP connections |
| Advertised client endpoint | `hostname-for-clients` | Every client using locator discovery |

A bind address is local: the process must own that interface inside its container. Geode's bind-address guidance requires a numeric IPv4 or IPv6 address, not a hostname. An advertised hostname is remote-facing: it must resolve and route from the client network. Docker service names therefore belong in `locators` and `hostname-for-clients`, not in `bind-address` or `server-bind-address`.

## Use Container DNS for an Internal-Only Cluster

Assume a user-defined Docker network has services named `locator`, `server1`, and `app`. Docker DNS makes those names resolvable among containers on that network.

For a normal single-network container, let the `gfsh start` launcher use its documented all-interface bind default and advertise the Docker service name to clients:

```text
gfsh> start locator \
  --name=locator1 \
  --hostname-for-clients=locator \
  --port=10334 \
  --dir=/data/locator1
```

Start the cache server from the `server1` container:

```text
gfsh> start server \
  --name=server1 \
  --hostname-for-clients=server1 \
  --server-port=40404 \
  --locators=locator[10334] \
  --dir=/data/server1
```

The application container can then use locator discovery:

```java
ClientCache cache = new ClientCacheFactory()
    .addPoolLocator("locator", 10334)
    .create();
```

Here, `locator` is valid in the peer-discovery list, and `server1` is the client-reachable name advertised by the cache server. Do not substitute `localhost`: inside `server1`, it identifies `server1`; inside `app`, it identifies `app`.

Binding to all local interfaces is usually appropriate in a single-network container. If a multi-homed container must bind one interface explicitly, pass that interface's numeric container IP and arrange for it to remain stable; do not pass the Docker DNS service name. Still set `hostname-for-clients` when the automatically selected host identity is not what clients should use. Advertising `0.0.0.0` is never useful to a remote client.

## Understand the Two Server Bind Settings

For `gfsh start server`, `--bind-address` is the member's general peer-facing address. `--server-bind-address` overrides it for the cache server that accepts client connections. Geode's documented precedence for client-server binding is:

1. `<cache-server bind-address="...">` in `cache.xml`;
2. `gfsh start server --server-bind-address=...`;
3. the `server-bind-address` property; and
4. the general `bind-address` property.

This allows a multi-homed process to use one interface for peer distribution and another for clients. In a simple Docker bridge they can use the same container interface, but they remain different protocols.

`--hostname-for-clients` does not change either listener. The cache server registers that advertised name and its `server-port` with locators. Locators return it to clients selecting a server. Changing only `server-bind-address` therefore cannot fix an address that is reachable inside Docker but unresolvable from a host-side application.

## Publish the Same Advertised Endpoint for External Clients

Suppose clients run outside Docker and use `geode.example.net`. Keep peer traffic on the Docker network, but advertise the external name:

```text
gfsh> start locator \
  --name=locator1 \
  --hostname-for-clients=geode.example.net \
  --port=10334

gfsh> start server \
  --name=server1 \
  --hostname-for-clients=geode.example.net \
  --server-port=40411 \
  --locators=locator[10334]
```

Publish the ports without translating the advertised port:

```yaml
services:
  locator:
    ports:
      - "10334:10334"
  server1:
    ports:
      - "40411:40411"
```

The external client uses `geode.example.net[10334]`; the locator then returns `geode.example.net[40411]`. If Docker maps host port `14041` to container port `40411`, Geode still advertises `40411`, because `hostname-for-clients` changes only the host portion. Prefer equal published and container ports, or put a network proxy and address plan in front of Geode that preserves the advertised endpoint.

With multiple servers behind one external host, give each server a distinct published `server-port`, or give each one a distinct externally routable hostname. A generic TCP load balancer in front of the locator does not automatically rewrite the individual server endpoints that the locator returns.

## Handle Clients on Two Networks Deliberately

One server advertises one `hostname-for-clients` value. If internal clients resolve `server1` but external clients require `geode.example.net`, use split-horizon DNS for one name, separate sets of servers with different advertised endpoints, or a routing layer designed for both. Server groups can help pools select separate server sets, but they do not change a server's advertised hostname. Do not expect Geode to choose an advertised hostname per client.

The locator itself also has `hostname-for-clients`, but clients are initially configured with at least one locator address. The server's advertised hostname is the critical second hop after discovery. Test both hops from the client namespace.

## Troubleshoot from Each Network Namespace

Validate the topology in this order:

```text
gfsh> connect --locator=locator[10334]
gfsh> list members
gfsh> describe member --name=server1
```

Then check name resolution and TCP reachability from the application container for the configured locator and the server endpoint returned by discovery. Review locator and server logs for the actual bound addresses. On an external host, test the public DNS name and both published ports rather than the Docker service names.

Typical symptoms map cleanly to the address planes:

- Locator alone in `list members`: fix the server's `locators`, peer `bind-address`, DNS, or peer firewall path.
- Client reports no available locators: fix the configured locator address, port publication, or locator TLS path.
- Client reaches the locator but reports no available servers: confirm a cache server is registered and its server group matches the pool.
- Client receives a server name it cannot resolve or route: fix `hostname-for-clients` and publish the same `server-port`.
- Connection refused on a published server port: verify `server-bind-address`, container listener, and Docker mapping.

## Official Documentation

- [Using bind addresses](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/using_bind_addresses.html)
- [`gfsh start locator` and `start server`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/start.html)
- [Firewalls and ports](https://geode.apache.org/docs/guide/latest/configuring/running/firewalls_ports.html)
- [How server discovery works](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/how_server_discovery_works.html)
- [`CacheServer` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/server/CacheServer.html)
- [`LocatorLauncher.Builder` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/distributed/LocatorLauncher.Builder.html)

## Conclusion

Use the launcher's all-interface default or bind Geode listeners to numeric addresses they own inside the container, use container DNS for peer discovery, and advertise exactly the hostname and port that clients can reach. Checking the locator hop, peer-membership hop, and discovered server hop separately makes Docker networking failures predictable instead of intermittent.
