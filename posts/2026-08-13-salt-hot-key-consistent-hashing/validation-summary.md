# Validation Summary: Consistent Hashing Still Has Hot Keys: Salt Without Breaking Reads

## Status

validated

## Post Type

Technical guide and Cassandra data-modeling tutorial

## Technologies Covered

- Apache Cassandra
- Cassandra Query Language (CQL)
- Consistent hashing and virtual nodes
- Partition-key salting and time bucketing
- Cassandra metrics and `nodetool`
- Logged batches and lightweight transactions
- Native-protocol result paging and client-side merge pagination
- SHA-256 deterministic shard routing

## Sources Consulted

- [Apache Cassandra: Dataset Partitioning, Consistent Hashing, Replication, and Vnodes](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: CQL Data Definition](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: CQL Data Manipulation, Tuple Relations, Ordering, and Batches](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra: CQL Data Types](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/types.html)
- [Apache Cassandra: Evaluating and Refining Data Models](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html)
- [Apache Cassandra: Monitoring Metrics](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html)
- [Apache Cassandra: `nodetool toppartitions`](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/toppartitions.html)
- [Apache Cassandra: `nodetool getendpoints`](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/getendpoints.html)
- [Apache Cassandra: `nodetool tablehistograms`](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablehistograms.html)
- [Apache Cassandra: Full Query Logging](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/fqllogging.html)
- [Apache Cassandra: Denylisting Partitions](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/denylisting_partitions.html)
- [Apache Cassandra 4.1: Denylisting Partitions](https://cassandra.apache.org/_/blog/Apache-Cassandra-4.1-Denylisting-Partitions.html)
- [Apache Cassandra: Static Columns](https://cassandra.apache.org/doc/latest/cassandra/reference/static.html)
- [Apache Cassandra: Native Protocol v5 Result Paging](https://cassandra.apache.org/doc/latest/cassandra/_attachments/native_protocol_v5.html#s7)
- [Apache Cassandra source: CQL `uuid` comparison](https://github.com/apache/cassandra/blob/trunk/src/java/org/apache/cassandra/db/marshal/UUIDType.java)
- [Apache Cassandra issue CASSANDRA-19699: mixed-order clustering tuple slices](https://issues.apache.org/jira/browse/CASSANDRA-19699)
- [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

## Issues Found

- The opening statement said consistent hashing does not divide traffic for one key, and the application-level analogy assumed exactly one owner. Those claims were too broad because reads may be served by different replicas within a fixed replica set and application rings may also replicate. The post now describes a fixed owner or replica set, while noting that Cassandra writes go to all replicas.
- The diagnostics list grouped latency, timeouts, failures, flushes, and compactions as both per-node and per-table metrics. Cassandra exposes general request timeouts and failures as node-local `ClientRequest` metrics, while table metrics expose local/coordinator latency, pending flushes, and pending compactions. The list now distinguishes those scopes.
- The shard function used an unspecified `stable_hash` and its test vector had no expected result. It now specifies SHA-256 over bytes decoded from canonical UUID text, treats the first digest byte as unsigned, and includes a checked vector whose expected shard is 8 for 16 buckets.
- The post described replica-set reuse between salted partitions as a token-collision concern. Exact hash collisions are not required: multiple distinct token ranges can have the same replica set. The wording now states that 16 CQL partitions may map to fewer than 16 distinct replica sets depending on cluster size, token ownership, and topology.
- The schema ordered `event_time` descending but implicitly left `event_id` ascending. Besides making the merge comparator underspecified, that mixed clustering direction is unsafe for a single tuple-slice keyset cursor in current Cassandra, as tracked by CASSANDRA-19699. The schema now declares both clustering columns descending, and the merge/pagination text explicitly requires Cassandra's CQL `uuid` comparator.
- The bucket-count migration wording implied every reader using one count would miss rows. In an in-place 16-to-32 increase, a 32-shard range fan-out includes the original 0-to-15 partitions, while old-count range readers and single-modulus point readers can miss data. The wording now identifies those cases precisely and adds the missing range-read requirement for ingestion-generation routing of late events.
- The CQL BATCH and native-protocol paging links used nonexistent fragments. They now target the current BATCH section and the v5 result-paging anchor.

## Review Notes

The corrected `CREATE TABLE` and `SELECT` examples are valid current CQL, and the documented `nodetool` commands are current. Partition denylisting requires Cassandra 4.1 or later. Full Query Logging is available from Cassandra 4.0 and records only successfully completed requests, so failed and timed-out requests require other diagnostic signals. Native paging and keyset pagination do not by themselves provide a snapshot across salted partitions while concurrent writes occur; the post does not claim otherwise.
