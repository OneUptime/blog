# Validation Summary: How to Configure Apache Cassandra Cluster with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Cassandra
- IPv6 networking
- `cassandra.yaml`
- `cqlsh`
- Cassandra Python Driver
- Linux `ip6tables`
- JMX

## Sources Consulted
- Apache Cassandra `cassandra.yaml` reference: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra FAQ: https://cassandra.apache.org/doc/stable/cassandra/overview/faq/index.html
- Apache Cassandra `cqlsh` documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/tools/cqlsh.html
- Apache Cassandra `jvm-server.options` source: https://raw.githubusercontent.com/apache/cassandra/trunk/conf/jvm-server.options
- Apache Cassandra `cassandra-env.sh` source: https://raw.githubusercontent.com/apache/cassandra/trunk/conf/cassandra-env.sh
- Apache Cassandra Python Driver getting started guide: https://docs.datastax.com/en/developer/python-driver/latest/getting_started/index.html
- Apache Cassandra Python Driver source docs (`getting_started.rst`): https://raw.githubusercontent.com/apache/cassandra-python-driver/master/docs/getting_started.rst

## Issues Found
- The post described `rpc_address` as a Thrift/native setting and used older RPC terminology. I corrected the wording to match current Cassandra docs, where `rpc_address` binds the native transport server and `broadcast_rpc_address` is advertised to drivers.
- The JVM section recommended `-Djava.net.preferIPv6Addresses=true`, but current Cassandra ships with `-Djava.net.preferIPv4Stack=true` and the upstream comment says to comment that out to enable IPv6 support. I replaced the JVM guidance accordingly.
- The JMX line `-Dcom.sun.jndi.rmiURLParsing=legacy` was unrelated to binding JMX on IPv6. I removed it.
- The seed example made all three nodes seeds. Cassandra’s FAQ recommends using two or more seed nodes per datacenter and syncing that seed list to all nodes, so I changed the example seed list to two nodes.
- The Python driver example used an unnecessary custom load-balancing policy with a hard-coded datacenter name. I simplified it to the current documented `Cluster(contact_points=..., port=...)` pattern and simplified the query result handling.
- The firewall example first allowed port 7000 from anywhere and then claimed to restrict it to a subnet, which would not actually restrict traffic in that rule order. I changed the internode and JMX rules so the source restriction is part of the allow rule itself.
- The firewall persistence command needed privileged execution for both reading the ruleset and writing the output file. I corrected it to `sudo ip6tables-save | sudo tee ...`.
- `ssl_storage_port` is still valid but deprecated in Cassandra 4.0+. I marked it as a legacy encrypted internode port in the snippet.

## Review Notes
- The post does not name a Cassandra version. The corrected content was aligned to current Apache Cassandra documentation available on 2026-05-06.
- `ssl_storage_port` remains supported for legacy scenarios, but current Cassandra documentation marks it deprecated in 4.0+ because a single internode port can handle secure and insecure traffic.
- Remote JMX exposure is optional. Cassandra defaults `LOCAL_JMX=yes` in `cassandra-env.sh`, so opening port `7199` is only needed when remote JMX access is intentionally enabled.
