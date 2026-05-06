# Validation Summary: How to Configure Cassandra with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Cassandra
- IPv6
- JVM networking properties
- cqlsh
- Python Cassandra driver
- Linux networking tools (`ss`, `systemctl`)

## Sources Consulted
- Apache Cassandra `cassandra.yaml` reference: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra configuration guide: https://cassandra.apache.org/doc/stable/cassandra/getting-started/configuring.html
- Apache Cassandra `jvm-*` configuration reference: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_jvm_options_file.html
- Apache Cassandra `cqlsh` documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/tools/cqlsh.html
- Apache Cassandra FAQ: https://cassandra.apache.org/doc/stable/cassandra/overview/faq/index.html
- Apache Cassandra Python driver API reference: https://python-driver.readthedocs.io/en/stable/api/cassandra/cluster.html
- Apache Cassandra upstream source for seed parsing: https://raw.githubusercontent.com/apache/cassandra/trunk/src/java/org/apache/cassandra/locator/SimpleSeedProvider.java
- Apache Cassandra upstream source for IP and port parsing: https://raw.githubusercontent.com/apache/cassandra/trunk/src/java/org/apache/cassandra/locator/InetAddressAndPort.java
- Oracle Java networking properties: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/net/doc-files/net-properties.html

## Issues Found
- The first `cassandra.yaml` example was invalid because it set `listen_address` and `listen_interface` together and implied that a blank `listen_address` causes Cassandra to use `listen_interface`. Cassandra requires setting `listen_address` or `listen_interface`, not both, and a blank `listen_address` falls back to hostname resolution. I changed the snippet to show interface-based settings as commented alternatives and added `listen_interface_prefer_ipv6` and `rpc_interface_prefer_ipv6`.
- The JVM section referenced `jvm.options`, but current Cassandra releases use `jvm-server.options` as the main static JVM configuration file. I updated that path and kept `cassandra-env.sh` as the older or dynamic alternative.
- The verification step used `ss -6 -tlnp | grep cassandra`, which is unreliable because `ss` typically reports the owning process as `java` and process visibility can depend on privileges. I replaced it with a port-based IPv6 listener check.
- The service command used `systemctl start cassandra` after configuration edits. I changed it to `systemctl restart cassandra`, which is the correct action after modifying `cassandra.yaml`.

## Review Notes
- Current Cassandra documentation shows seed entries as host or host:port values. The post’s portless IPv6 seed list remains valid because Cassandra’s seed parsing accepts host or IP entries without an explicit port and uses the default storage port when none is provided.
- `-Djava.net.preferIPv6Addresses=true` is most relevant when hostnames or interface-based resolution can return both IPv4 and IPv6 addresses. It is not harmful when explicit IPv6 literals are already configured.
