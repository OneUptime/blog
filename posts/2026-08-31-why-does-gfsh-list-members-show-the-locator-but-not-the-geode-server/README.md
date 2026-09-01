# Why Does `gfsh list members` Show the Locator but Not the Geode Server?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Troubleshooting, Java, Networking, Distributed Database

Description: Trace a missing Geode server from its process status and log through locator discovery, cluster identity, security, and peer-network membership.

---

`gfsh list members` reports members in the distributed system managed by the JMX Manager to which `gfsh` is connected. If it shows a locator but not an expected server, that server has not joined this locator's cluster, has already left it, or never became a running Geode server process. The cache-server port used by clients is not what makes the process appear in this list; peer membership is.

Work from process evidence toward cluster evidence. Restarting repeatedly without reading the server log often hides the first useful exception.

## Verify Which Cluster `gfsh` Is Showing

Reconnect explicitly and list members:

```text
gfsh> disconnect
gfsh> connect --locator=locator-a.example.net[10334]
gfsh> list members
```

A locator normally starts a JMX Manager when no other manager is available. `list members` is an online command and queries that manager's membership view. Record the locator address from the successful `connect` output; do not assume that a shell's earlier connection, a default `localhost`, or a forwarded port points at the intended cluster.

In Docker, `localhost` normally means the container's network namespace; in Kubernetes, it means the pod's shared network namespace. A server configured with `locators=localhost[10334]` will not reach a locator in a different Docker network namespace or a different pod. Use a resolvable service name or container-network address, such as `geode-locator[10334]`.

## Check Whether the Server Process Is Actually Running

On the host or container that owns the server working directory, ask for its launcher status:

```text
gfsh> status server --dir=/var/lib/geode/server1
```

If `gfsh` is connected and the server is currently joined to that cluster, an online status check by name is also useful:

```text
gfsh> status server --name=server1
```

The directory-based form is important when the member never joined and therefore cannot be found by name through the manager. Inspect the log path reported by the launcher or status output. With the default log-file naming used here, it is:

```text
/var/lib/geode/server1/server1.log
```

Look from the first startup error, not only at the final shutdown message. Common evidence includes an unreachable locator, authentication or TLS failure, a duplicate member name, a bind failure, an incompatible configuration, a network-partition response, or a JVM exit.

## Start with an Explicit Locator List

Remove ambiguity by giving the server a unique name, persistent working directory, and the intended locator list:

```text
gfsh> start server \
  --name=server1 \
  --dir=/var/lib/geode/server1 \
  --locators=locator-a.example.net[10334],locator-b.example.net[10334] \
  --server-port=40404
```

Then verify membership before creating or testing regions:

```text
gfsh> list members
gfsh> describe member --name=server1
```

When connected, `gfsh start server` can use the current cluster's locator list as a default when no locator setting is supplied; by default, the server then requests cluster configuration from those locators. An explicit `--locators` value makes scripts and incident evidence much easier to audit. In `gemfire.properties`, the equivalent peer discovery setting is:

```properties
locators=locator-a.example.net[10334],locator-b.example.net[10334]
mcast-port=0
name=server1
```

Check command-line options, `gemfire.properties`, environment-generated files, and `--properties-file`; the effective value may not be the file an operator first opens.

## Distinguish Membership Ports from Client Ports

A Geode server participates in several kinds of communication:

- The locator port, `10334` by default, supports peer and cache-server discovery.
- Peer membership uses TCP and UDP ports, while general peer messaging and region-operation distribution use TCP by default.
- The cache-server port, `40404` by default, accepts client operations.
- JMX or HTTP management uses its own configured endpoint.

Publishing only `40404` exposes the client listener and is not sufficient for peer membership. Conversely, a server can join the member list even if its client-facing `40404` address is unusable. Check DNS and TCP reachability from the server process to at least one intended locator, verify every configured locator for redundancy, and allow TCP and UDP peer communication between cluster members. In a firewalled deployment, configure a deliberate port plan rather than assuming the locator and server port are sufficient for all peer traffic.

A specific, non-wildcard bind address must belong to an interface in the server's own network namespace. For the `gfsh` and `gemfire.properties` bind settings discussed here, Geode documents numeric IPv4 or IPv6 addresses, not DNS hostnames; hostnames are valid in the `--locators` list. `--bind-address` controls the member's peer-facing bind. `--server-bind-address` controls the cache server's client listener. `--hostname-for-clients` advertises a client-reachable name and does not repair peer membership.

## Compare Cluster Identity and Security

Reaching a TCP listener is not the same as joining its distributed system. Compare these settings between locator and server:

- locator host and port list;
- TLS components, protocols, keystore, truststore, and credentials;
- security manager and authentication properties;
- peer bind addresses, membership port ranges, and firewall policy;
- Geode and Java versions supported by the deployment; and
- network-partition and membership settings.

Member groups and `--use-cluster-configuration` determine which configuration a server receives after it joins; they do not by themselves hide a joined server from `list members`. Diagnose those settings later if the server is listed but lacks the expected regions.

If the server points at another reachable locator, it may have joined a different healthy cluster. Connect `gfsh` to that address and run `list members` to prove or disprove the split-cluster hypothesis. Do not connect the two live clusters casually; preserve their logs and configuration first if they might hold different data.

A server that fails authentication or TLS negotiation usually logs the cause locally before it can be managed remotely. `show log --member=server1` cannot help unless the member is currently joined and visible to the manager, so local startup output and working-directory logs, including a separate security log if configured, are the primary evidence during bootstrap.

## Use a Short Diagnostic Decision Tree

1. If `status server --dir=...` says stopped, inspect the server log and startup exit output.
2. If the process is running but no server appears, compare its effective locator list with the locator used by `gfsh`.
3. If DNS or TCP connection fails from inside the server container, fix routing, service names, or firewall policy.
4. If the locator accepts TCP but the join fails, compare TLS, security, versions, bind addresses, and the first membership exception.
5. If the server appears briefly and disappears, inspect both server and locator logs for departure, forced disconnect, resource exhaustion, or network-partition messages.
6. Once it remains listed, run `describe member` and `list regions --members=server1` to verify its member details and confirm that the expected regions are present.

This order separates a launcher failure from a discovery failure and a discovery failure from a post-join departure.

## Official Documentation

- [`gfsh list members` and `list regions`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/list.html)
- [`gfsh start server` options](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/start.html)
- [Running Geode server processes](https://geode.apache.org/docs/guide/latest/configuring/running/running_the_cacheserver.html)
- [How server discovery works](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/how_server_discovery_works.html)
- [Using bind addresses](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/using_bind_addresses.html)
- [Firewalls and Geode ports](https://geode.apache.org/docs/guide/latest/configuring/running/firewalls_ports.html)
- [System failure and recovery](https://geode.apache.org/docs/guide/latest/managing/troubleshooting/system_failure_and_recovery.html)

## Conclusion

`list members` is a cluster-membership view, not a list of processes or open cache-server ports. Confirm the server process, read its local log, make its locator list match the cluster shown by `gfsh`, and then check peer reachability and security. Once the join succeeds and remains stable, the server will appear without any special `list members` configuration.
