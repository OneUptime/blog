# Validation Summary: How to Configure Geode Locator and Server Bind Addresses in Docker

## Status
validated

## Post Type
Technical guide and troubleshooting tutorial

## Technologies Covered
- Apache Geode 2.0.2
- Geode `gfsh`, locator discovery, peer membership, cache servers, and client pools
- Docker and Docker Compose networking, DNS, and port publishing
- Java `ClientCacheFactory`
- TCP/IP bind addresses, advertised endpoints, DNS, and proxies

## Sources Consulted
- [Apache Geode 2.0.2 release](https://github.com/apache/geode/releases/tag/rel/v2.0.2)
- [Geode 2.0 `gfsh start` command reference](https://geode.apache.org/docs/guide/20/tools_modules/gfsh/command-pages/start.html)
- [Geode 2.0 bind-address guidance and precedence](https://geode.apache.org/docs/guide/20/topologies_and_comm/topology_concepts/using_bind_addresses.html)
- [Geode 2.0 distributed-system property reference](https://geode.apache.org/docs/guide/20/reference/topics/gemfire_properties.html)
- [Geode server-discovery documentation](https://geode.apache.org/docs/guide/20/topologies_and_comm/topology_concepts/how_server_discovery_works.html)
- [Geode client socket-factory and SNI proxy documentation](https://geode.apache.org/docs/guide/20/reference/topics/client-cache.html#cc-socket-factory)
- [Geode `ClientCacheFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html)
- [Geode `CacheServer` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/server/CacheServer.html)
- [Geode 2.0.2 cache-server registration source](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/internal/cache/CacheServerImpl.java)
- [Geode 2.0.2 peer-address selection source](https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/distributed/internal/direct/DirectChannel.java)
- [Docker Compose networking documentation](https://docs.docker.com/compose/how-tos/networking/)
- [Docker port-publishing documentation](https://docs.docker.com/engine/network/port-publishing/)

## Issues Found
- The multiline `gfsh>` examples used trailing backslashes. In a PTY test of the released Geode 2.0.2 binary, interactive `gfsh` returned to its primary prompt after the first line and treated the following option as a separate command. All `start locator` and `start server` examples were flattened to single lines for reliable copy and paste.
- The post described the unset bind behavior as a single all-interface default. Geode uses the container's default address when the peer `bind-address` is unset, while the locator and default cache-server listeners have their own listener defaults. The wording now refers to Geode's default address selection without conflating these behaviors.
- The client-listener precedence list omitted higher-precedence programmatic API settings. The list is now scoped to `cache.xml`, `gfsh`, and `gemfire.properties`, and the API precedence is stated explicitly.
- The post said changing only `server-bind-address` could never affect an unroutable advertised address. When `hostname-for-clients` is unset, Geode derives the advertised host from the cache server's bind or external address. The text now explains that fallback while retaining the recommendation to configure `hostname-for-clients` explicitly for Docker NAT.
- Client reachability was stated as an absolute requirement for every advertised hostname. Geode can instead use a configured socket factory such as `SniProxySocketFactory` to route locator and server connections through a proxy without client-side resolution of each member name. The direct-connection claims and conclusion were qualified accordingly.
- The Compose YAML was only a port-mapping fragment and was not a complete standalone service definition. Its introduction now says to add the mappings to existing service definitions.

## Review Notes
The remaining Geode commands and options are current in 2.0.2, the Java `ClientCacheFactory.addPoolLocator` example uses a current non-deprecated API, the Docker service-name and port-mapping explanations are correct, and every documentation link in the post returned HTTP 200. `gfsh connect --locator` discovers a separate JMX Manager endpoint; running `gfsh` outside Docker can additionally require `jmx-manager-hostname-for-clients` and publication of the JMX Manager port, but the post does not claim that the external application-client mappings also expose remote management.
