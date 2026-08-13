# Validation Summary: Can You Change a Cassandra Partition Key? Replace, Backfill, and Cut Over

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Apache Cassandra
- Cassandra Query Language (CQL)
- Partition and clustering keys
- Mutation timestamps, TTLs, and tombstones
- Change Data Capture (CDC) and Full Query Logging (FQL)
- Logged batches, counters, and lightweight transactions
- Token-range backfills and SSTable bulk loading
- Cassandra metrics, repair, validation, and staged cutover

## Sources Consulted

- [Apache Cassandra: ALTER TABLE](https://cassandra.apache.org/doc/stable/cassandra/reference/cql-commands/alter-table.html)
- [Apache Cassandra: CQL Data Definition](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: CREATE TABLE](https://cassandra.apache.org/doc/stable/cassandra/reference/cql-commands/create-table.html)
- [Apache Cassandra: Data Manipulation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra: CQL BATCH](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/cql_singlefile.html#batchStmt)
- [Apache Cassandra: Dynamo architecture and mutation versioning](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: Tombstones and compaction](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html)
- [Apache Cassandra: Counter columns](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/counter-column.html)
- [Apache Cassandra: Consistency guarantees and lightweight transactions](https://cassandra.apache.org/doc/stable/cassandra/architecture/guarantees.html)
- [Apache Cassandra source: conditional batch validation](https://github.com/apache/cassandra/blob/cassandra-5.0/src/java/org/apache/cassandra/cql3/statements/BatchStatement.java)
- [Apache Cassandra: Change Data Capture](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/cdc.html)
- [Apache Cassandra: Full Query Logging](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/fqllogging.html)
- [Apache Cassandra: Monitoring metrics](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html)
- [Apache Cassandra: nodetool tablehistograms](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablehistograms.html)
- [Apache Cassandra: nodetool tablestats](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablestats.html)
- [Apache Cassandra: nodetool toppartitions](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/toppartitions.html)
- [Apache Cassandra: Bulk Loading](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bulk_loading.html)
- [Apache Cassandra: Repair](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/repair.html)
- [Apache Cassandra Java Driver: Idempotence](https://apache.github.io/cassandra-java-driver/4.19.0/core/idempotence/)
- [Apache Cassandra Java Driver: Query timestamps](https://apache.github.io/cassandra-java-driver/4.19.0/core/query_timestamps/)

## Issues Found

- The TTL checklist could be read as copying the value returned by `TTL()` directly. Because `TTL()` reports the remaining lifetime when the source is read and `USING TTL` starts the supplied lifetime when the target write executes, the post now says to preserve the original absolute expiration and recompute the remaining TTL for each target write.
- The delete checklist mentioned only row and partition deletes. It now also covers cell or collection-element deletes and clustering-range tombstones so that every CQL deletion shape is included.
- The mutation-timestamp statement incorrectly included counters by implication. It now refers to ordinary cells because counters use specialized merge semantics and reject normal `TIMESTAMP` and TTL handling.
- The CDC description could imply that Cassandra creates filtered, per-table commit-log segments. It now states that CDC exposes commit-log segments containing mutations for CDC-enabled tables.
- The dual-write retry guidance did not say how timestamps must be preserved. It now requires corresponding v1 and v2 cells to use the same client-assigned timestamp and requires retries to reuse it; the counter exception remains explicit.
- The post described the v1/v2 batch as only likely to be cross-partition. Because the two mutations use different table partition keys, it necessarily spans partitions. The text now states that directly and adds that conditional batches cannot provide cross-table or cross-partition LWT dual writes or use client timestamps.
- The post discussed renaming tables even though CQL has no table-rename operation. It now accurately describes the risky alternative as dropping and recreating tables to reuse names.
- The CQL BATCH documentation link used the nonexistent `#batch` fragment. It now targets the current `#batchStmt` anchor.

## Review Notes

Both `CREATE TABLE` examples are valid in current Apache Cassandra. In each schema, `event_id` is a second clustering column whose omitted clustering direction defaults to ascending, so a complete cross-partition merge orders by `event_time DESC` and then `event_id ASC`. Full Query Logging is available in Cassandra 4.0 and later; the current warning that it is not a lossless CDC mechanism is correct because failed or timed-out requests are absent and records can be dropped when non-blocking logging falls behind. No Cassandra release was pinned, so the review used the current stable/latest Apache Cassandra 5.0 documentation.
