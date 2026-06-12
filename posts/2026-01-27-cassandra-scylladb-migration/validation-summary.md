# Validation Summary: How to Migrate from Cassandra to ScyllaDB

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Apache Cassandra
- ScyllaDB
- CQL and cqlsh
- nodetool
- ScyllaDB SSTableLoader
- DataStax / Apache Cassandra Java driver
- DataStax / Apache Cassandra Python driver
- Cassandra CDC
- Kafka
- cassandra-stress

## Sources Consulted
- ScyllaDB SSTableLoader documentation: https://docs.scylladb.com/manual/stable/operating-scylla/admin-tools/sstableloader.html
- ScyllaDB Apache Cassandra to ScyllaDB migration process: https://docs.scylladb.com/manual/stable/operating-scylla/procedures/cassandra-to-scylla-migration-process.html
- ScyllaDB third-party driver compatibility documentation: https://docs.scylladb.com/stable/drivers/third-party-drivers.html
- Apache Cassandra bulk loading documentation: https://cassandra.apache.org/doc/4.0/cassandra/operating/bulk_loading.html
- Apache Cassandra nodetool snapshot documentation: https://cassandra.apache.org/doc/4.0/cassandra/tools/nodetool/snapshot.html
- Apache Cassandra CDC documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/operating/cdc.html
- DataStax Java Driver 4.17 speculative execution documentation: https://docs.datastax.com/en/developer/java-driver/4.17/manual/core/speculative_execution/
- DataStax Python Driver getting started and execution profile documentation: https://docs.datastax.com/en/developer/python-driver/3.23/getting_started/
- DataStax CQL INSERT documentation: https://docs.datastax.com/en/cql-oss/3.x/cql/cql_reference/cqlInsert.html

## Issues Found
- The introduction said ScyllaDB accepts Cassandra SSTables directly. Changed this to say ScyllaDB can load Cassandra SSTables through ScyllaDB loader tools, which is more accurate for the documented migration process.
- The post presented `sstableloader` as the current most reliable method without caveat. Updated the text to note that ScyllaDB marks SSTableLoader as deprecated and recommends `nodetool refresh --load-and-stream` where possible.
- The `sstableloader` example used `--keyspace`, which is not a ScyllaDB SSTableLoader option. Removed it and documented that the target keyspace/table is derived from a `/keyspace/table` directory path.
- The authenticated `sstableloader` example used `-u`; ScyllaDB documents `--username` and `-pw/--password`. Updated the command to use `--username`.
- The counter-table checklist was too general. Updated it to call out the ScyllaDB-documented limitation for Apache Cassandra 2.0 local counter SSTables.
- The Java driver example described speculative execution without mentioning that Java driver speculative execution only applies to idempotent statements. Added that caveat.
- The Java dual-write example caught `Exception` and rethrew it from a method that did not declare checked exceptions. Changed the catch to `RuntimeException`.
- The Java dual-write example referenced `ValidationResult` without defining it. Added a minimal nested class so the example is self-contained.
- The CDC section implied Cassandra CDC directly provides guaranteed Kafka delivery. Reworded it to describe a CDC pipeline built from Cassandra CDC files and an external publisher, with durable replay conditions.
- The CDC Python example imported an unused Kafka producer, did not preserve timestamps for inserts, and called undefined helper methods. Removed the unused import, added `USING TIMESTAMP` to inserts, and added `_build_where_clause` / `_get_key_values`.
- The validation script advised `ALLOW FILTERING with LIMIT` for large `COUNT(*)` validation. Replaced this with tablestats estimates or token-range sampling/checksums.
- The validation script described `SELECT DISTINCT ... LIMIT` sampling as random. Changed the description to bounded sampling and added a note that true random sampling requires an application-side sample set or token-range approach.

## Review Notes
- The post remains a high-level migration guide. Production migrations should still pin the exact Cassandra and ScyllaDB versions, because schema compatibility, SSTable format support, CDC behavior, and migration tooling differ by version.
- The dual-write examples are illustrative and still need production hardening around prepared statement caching, retry durability, idempotence, timestamp generation, shutdown handling, and reconciliation.
