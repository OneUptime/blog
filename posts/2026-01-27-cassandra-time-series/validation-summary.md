# Validation Summary: How to Use Cassandra with Time-Series Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- Cassandra data modeling for time-series workloads
- Cassandra TTL, tombstones, and compaction lifecycle
- Cassandra nodetool
- DataStax Java Driver for Apache Cassandra
- DataStax Python Driver for Apache Cassandra
- Python asyncio

## Sources Consulted
- Apache Cassandra CQL data definition documentation: https://cassandra.apache.org/doc/4.0/cassandra/cql/ddl.html
- Apache Cassandra CQL data manipulation documentation: https://cassandra.apache.org/doc/4.0/cassandra/cql/dml.html
- Apache Cassandra ALTER TABLE table options documentation: https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/alter-table.html
- Apache Cassandra nodetool tablehistograms documentation: https://cassandra.apache.org/doc/4.0/cassandra/tools/nodetool/tablehistograms.html
- DataStax Cassandra data modeling best practices: https://docs.datastax.com/en/cql/hcd/data-modeling/best-practices.html
- DataStax TTL documentation for Cassandra CQL: https://docs.datastax.com/en/cql-oss/3.3/cql/cql_using/useExpire.html
- DataStax Java Driver prepared statements documentation: https://docs.datastax.com/en/developer/java-driver/4.14/manual/core/statements/prepared/
- DataStax Python Driver getting started and prepared statements documentation: https://docs.datastax.com/en/developer/python-driver/3.23/getting_started/
- DataStax asynchronous query execution and batching guidance: https://docs.datastax.com/en/hyper-converged-database/1.2/drivers/asynchronous-queries.html

## Issues Found
- The post said data within a partition is stored contiguously on disk. Cassandra guarantees that rows sharing a partition key are stored on the same replica set and ordered by clustering columns, but an LSM/SSTable storage engine can spread a partition across SSTables. Updated the wording to avoid the overstatement.
- The high-frequency bucketing guidance recommended one-hour buckets for sub-second data and listed approximately 3.6 million rows per partition, which conflicted with the later recommendation to keep partitions under 100,000 rows. Updated the example comments and matrix to recommend smaller or sharded buckets for very high-rate logs/traces.
- The TTL section described TTL as automatically deleting data. Cassandra expires data by marking it with tombstones, then compaction removes tombstone data after the grace period. Updated the description to reflect the actual lifecycle.
- The Python driver examples used `str` for `service_id` while the CQL schemas defined `service_id UUID`. Updated the type hints and usage example to use `uuid.UUID`.
- The asyncio query example used blocking `session.execute()` inside coroutines, so `asyncio.gather()` would not provide true concurrent Cassandra I/O. Updated the example to use the Python driver's `execute_async()` and bridge its callbacks into asyncio futures.
- Removed unused Python imports that were left in the affected snippets.

## Review Notes
- The Java example references a `MetricPoint` type without defining it. This is acceptable for a focused repository snippet, but a future standalone sample should include a small record/class definition.
- The consistency-level recommendation of `LOCAL_ONE` is technically valid for some write-heavy workloads, but production systems should choose it only after evaluating durability and consistency requirements.
