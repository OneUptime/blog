# Validation Summary: Set an Apache Geode Client Timeout When No Locator Is Available

## Status
validated

## Post Type
Technical troubleshooting and configuration guide

## Technologies Covered

- Apache Geode Java client
- Java
- Geode client connection pools
- Locator and cache-server discovery
- `client-cache.xml`
- TCP, TLS, DNS, and connection timeouts
- Geode `gfsh`

## Sources Consulted

- [Apache Geode `ClientCacheFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html)
- [Apache Geode `PoolFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/PoolFactory.html)
- [Apache Geode `ClientRegionFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientRegionFactory.html)
- [Apache Geode `Region.containsKeyOnServer` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/Region.html#containsKeyOnServer(java.lang.Object))
- [Apache Geode `NoAvailableLocatorsException` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/NoAvailableLocatorsException.html)
- [Apache Geode `NoAvailableServersException` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/NoAvailableServersException.html)
- [Apache Geode cache XML requirements](https://geode.apache.org/docs/guide/latest/reference/topics/elements_ref.html)
- [Apache Geode `client-cache` and pool element reference](https://geode.apache.org/docs/guide/latest/reference/topics/client-cache.html)
- [Apache Geode server-discovery documentation](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/how_server_discovery_works.html)
- [Apache Geode client/server connection-pool behavior](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/how_the_pool_manages_connections.html)
- [Apache Geode `list members` command reference](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/list.html) and [`describe member` command reference](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/describe.html)
- [Apache Geode `CacheServer` Java API for `hostname-for-clients`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/server/CacheServer.html)
- [Apache Geode 2.0.2 client connection implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/cache/client/internal/ConnectionImpl.java), [TLS socket implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/internal/net/SCAdvancedSocketCreator.java), and [TLS handshake implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/internal/net/SocketCreator.java)
- [Apache Geode 2.0.2 locator connection source](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/cache/client/internal/AutoConnectionSourceImpl.java) and [`TcpClient` request/reply implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-tcp-server/src/main/java/org/apache/geode/distributed/internal/tcpserver/TcpClient.java)
- [Apache Geode 2.0.2 deferred hostname-resolution implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-tcp-server/src/main/java/org/apache/geode/distributed/internal/tcpserver/InetSocketWrapper.java)
- [Apache Geode 2.0.2 connection-pool wait and background-prefill implementation](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/cache/client/internal/pooling/ConnectionManagerImpl.java)
- [Apache Geode 2.0.2 `containsKeyOnServer` command](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/internal/cache/tier/sockets/command/ContainsKey66.java) and [client response handling](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/cache/client/internal/AbstractOp.java)
- [Apache Geode 2.0.2 cache XML schema](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/resources/META-INF/schemas/geode.apache.org/schema/cache/cache-1.0.xsd)

## Issues Found

- The post described `socket-connect-timeout` as bounding only the raw TCP socket connection and treated TLS as an unrelated phase. Geode also reuses this value for the TLS handshake, the Geode client/server handshake, and locator discovery request/reply. The introduction, timeout table, elapsed-time explanation, and conclusion were corrected to describe that scope while retaining the distinction from `read-timeout` for ordinary region operations.
- The XML example omitted the current Geode namespace, schema location, and required `version="1.0"` declaration. The XML declaration and complete `client-cache` schema attributes were added, and the resulting example was validated against Geode's `cache-1.0.xsd`.
- The statement that `free-connection-timeout` is categorically irrelevant when no locator is available was too broad. A bounded pool that is already at `max-connections` can still wait for a free pooled connection while locators are unavailable. The text now states precisely that this setting does not bound locator connection attempts and instead governs bounded-pool contention.
- The description of `NoAvailableLocatorsException` incorrectly implied that all locator processes must be inactive or network-unreachable. Locator I/O, TLS, protocol, or unusable-response failures can also lead to this exception. It now says that the client could not obtain a usable response from any locator known to the pool.
- The incident checklist treated `list members` as evidence that cache-server endpoints were registered and running. That command only lists distributed-system members. The step now uses `list members` for membership and follows it with `describe member --name=<server>` to check the cache-server endpoint.
- The production guidance said to size the socket connect timeout above DNS latency, although Geode performs hostname resolution before `Socket.connect` and the socket timeout does not bound DNS. It now refers to TCP and handshake latency; the separate DNS caveat remains in the elapsed-time section.
- The zero-value statement was phrased as unconditional runtime behavior. The public API defines zero as infinite, but the current locator request path appears inconsistent with that contract. The post now attributes the definition to the Java API and retains the recommendation to use a positive timeout.

## Review Notes
The Java examples use current, non-deprecated Geode APIs and compile against `geode-core` 2.0.0 when placed in normal class/method scaffolding with the post's assumed application `Order` type. `containsKeyOnServer` performs the intended non-mutating server round trip, and server-side missing-region or authorization failures are wrapped in `ServerOperationException`, which the shown `ServerConnectivityException` catch handles. The public `releases/latest` Java API is currently labeled 2.0.0; the relevant behavior was also checked in the Apache Geode 2.0.2 release source. The API contract defines a zero socket-connect timeout as infinite, but the current locator `TcpClient` implementation appears to expire a zero-valued locator request after its version probe; the post therefore continues to recommend a positive value and attributes the zero behavior to the documented API contract.
