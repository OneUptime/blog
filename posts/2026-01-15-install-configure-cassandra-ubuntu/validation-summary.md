# Validation Summary: How to Install and Configure Apache Cassandra on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Cassandra 4.1 (distributed NoSQL database)
- CQL (Cassandra Query Language)
- cqlsh
- nodetool
- Ubuntu 20.04 / 22.04
- OpenJDK (Java 8 / 11)
- systemd service management
- keytool / Java keystores (SSL/TLS)

## Sources Consulted
- Apache Cassandra 4.1 cassandra.yaml reference: https://cassandra.apache.org/doc/4.1/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra 4.1 jvm-* options files: https://cassandra.apache.org/doc/4.1/cassandra/configuration/cass_jvm_options_file.html
- Apache Cassandra Java 11 support docs: https://cassandra.apache.org/doc/4.1/cassandra/getting_started/java11.html
- Apache Cassandra Java 17 support (5.0): https://cassandra.apache.org/doc/latest/cassandra/reference/java17.html
- Apache Cassandra installation docs: https://cassandra.apache.org/doc/latest/cassandra/installing/installing.html
- CASSANDRA-13701 (num_tokens default changed 256 → 16)

## Issues Found
1. **Incorrect Java version requirement.** The prerequisites listed "Java 11 or 17." Cassandra 4.1 supports only Java 8 and Java 11; Java 17 support was introduced in Cassandra 5.0. Changed to "Java 8 or 11" with a clarifying note.
2. **Misleading `num_tokens` comment and outdated default.** The config used `num_tokens: 256` with the comment "Number of replicas." `num_tokens` is the number of virtual nodes (vnodes) per node, not replicas, and the default changed from 256 to 16 in Cassandra 4.0+. Updated the value to `16` and corrected the comment.
3. **Deprecated `compaction_throughput` parameter name.** The post used `compaction_throughput_mb_per_sec: 64`. Cassandra 4.1 introduced unit-based configuration values; the canonical name is now `compaction_throughput: 64MiB/s` (the old name is deprecated but still accepted). Updated to the current form with a note.
4. **Wrong JVM options file path.** The post referenced `/etc/cassandra/jvm.options` for heap/GC settings (twice). In Cassandra 4.0+ this file was split, and heap/GC startup parameters live in `/etc/cassandra/jvm-server.options`. Corrected both occurrences.
5. **Mislabeled health-check command.** Under "Health Checks," `nodetool cfstats` was labeled "Check dropped messages." `cfstats` is a deprecated alias of `tablestats` and reports keyspace/table statistics; dropped messages are reported by `nodetool tpstats`. Corrected the comment to describe what `cfstats` actually does.

## Review Notes
- Setting `-Xmn800M` (young generation size) alongside `-XX:+UseG1GC` is generally discouraged, since G1GC sizes the young generation adaptively and an explicit `-Xmn` can override its pause-time goals. Cassandra's shipped jvm options leave `-Xmn` unset for G1GC. This was left as-is since it is advisory tuning rather than a hard error, but readers using G1GC should consider omitting it.
- The repository setup (`41x` suite at `debian.cassandra.apache.org`, KEYS at `downloads.apache.org`) is correct for Cassandra 4.1.
- All CQL examples (keyspace/table/index creation, CRUD, TTL, batch, collections, compaction strategies) are syntactically valid for Cassandra 4.1.
- `nodetool cfstats` and `nodetool tpstats` are deprecated aliases (of `tablestats` and `tpstats` respectively in newer naming) but remain functional in 4.1.
- The default `endpoint_snitch` in 4.x is `SimpleSnitch`, matching the example; `GossipingPropertyFileSnitch` is correctly recommended for production/multi-DC.
