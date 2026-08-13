# Consistent Hashing Still Has Hot Keys: Salt Without Breaking Reads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Cassandra, Consistent Hashing, Hot Partitions, Key Salting, Data Modeling, Distributed Databases

Description: Split a hot logical key into deterministic Cassandra buckets while preserving targetable point reads, bounded fan-out, ordering, and a safe bucket-count migration.

---

Consistent hashing distributes different keys and limits how much ownership changes when nodes change. It does not divide the traffic for one key. If “global-feed” receives 40% of writes, its hash maps to one token and one Cassandra replica set. Adding virtual nodes makes token ownership more even across the cluster; it does not split that partition across replica sets.

Salting can split the logical key, but every added bucket becomes part of the read contract. A successful design specifies write routing, point reads, range reads, ordering, atomicity, and bucket-count evolution before the first salted write.

## Prove the Hotspot Is Key-Specific

Do not redesign from node CPU alone. A node can be overloaded by uneven token ownership, repair, compaction, hardware, a large scan, or one hot partition.

Use several signals:

- per-node and per-table read/write latency, timeouts, failures, pending flushes, and compactions;
- partition-size and cell-count histograms;
- application request rate grouped by logical key;
- <code>nodetool toppartitions</code> sampling for the affected table;
- <code>nodetool getendpoints</code> for suspected partition keys;
- tracing or full query logging in a controlled diagnostic window.

Apache Cassandra metrics are node-local, so aggregate them externally while retaining node labels. <code>EstimatedPartitionSizeHistogram</code> identifies size skew, not traffic frequency by itself. A tiny key can be read-hot; a huge cold key can be maintenance-heavy.

Classify the hotspot:

| Type | Evidence | Likely response |
| --- | --- | --- |
| read hot | high request share, stable data | cache, replicate derived result, request coalescing |
| write hot | mutation share concentrated | deterministic buckets, upstream aggregation |
| large partition | high bytes/cells | time bucketing or sharding column |
| mixed | all of the above | replacement query model |

Cassandra's partition denylist can contain a dangerous partition by rejecting reads or writes according to configuration. It is an incident guardrail, not a way to restore service for legitimate traffic.

## Understand Why the Ring Cannot Help

Cassandra hashes a CQL partition key to a token. The replication strategy selects the nodes that store that token range. With replication factor three, a mutation for one key goes to three distinct replicas; replication increases durability and availability but does not distribute that key's writes among arbitrary nodes.

Virtual nodes let each physical node own multiple token ranges and help distribute many partitions. Every row sharing one partition key still belongs to the same replica set. A million uniformly used keys can balance well; one dominant key remains dominant.

The same principle applies to application-level consistent hashing outside Cassandra: a ring maps one key to one owner. More virtual points improve the distribution of many keys, not the frequency distribution within a key.

## Add a Deterministic Bucket

Suppose this table stores one account's events in one ever-growing partition:

~~~sql
CREATE TABLE events_by_account (
    account_id text,
    event_time timestamp,
    event_id uuid,
    payload text,
    PRIMARY KEY (account_id, event_time, event_id)
);
~~~

Replace it with bounded day and shard components:

~~~sql
CREATE TABLE events_by_account_bucket (
    account_id text,
    event_day date,
    shard tinyint,
    event_time timestamp,
    event_id uuid,
    payload text,
    PRIMARY KEY ((account_id, event_day, shard), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);
~~~

The writer computes:

~~~text
event_day = UTC date of event_time
shard = stable_hash(event_id) mod 16
~~~

Use one specified hash algorithm and byte encoding in every language. “Language default hash” is unsafe: runtimes may use different algorithms, seeds, sign behavior, or string encodings. Publish test vectors:

~~~text
event_id bytes                       bucket_count   expected shard
00112233-4455-6677-8899-aabbccddeeff 16             ...
~~~

Generate expected results from the chosen implementation and check them in each client.

The day bounds partition growth, while the salt splits a hot account-day across up to 16 replica sets, subject to token collisions and cluster topology.

## Preserve Targetable Point Reads

If a request includes <code>event_id</code>, it can recompute the shard and issue one query:

~~~sql
SELECT *
FROM events_by_account_bucket
WHERE account_id = ?
  AND event_day = ?
  AND shard = ?
  AND event_time = ?
  AND event_id = ?;
~~~

If <code>event_day</code> or <code>event_time</code> is unknown, a secondary lookup table can map event ID to routing coordinates:

~~~sql
CREATE TABLE event_location_by_id (
    account_id text,
    event_id uuid,
    event_day date,
    shard tinyint,
    event_time timestamp,
    PRIMARY KEY ((account_id, event_id))
);
~~~

This is denormalization, consistent with Cassandra's query-driven modeling. The write path now maintains two tables. Decide how retries, partial failure, deletion, and repair work. A logged batch can make multiple mutations eventually all succeed or none, but isolation applies only within one partition and cross-partition batches have a performance penalty. Batches are not SQL transactions.

## Make Range-Read Fan-Out Bounded

A full account-day read queries 16 partitions in parallel:

~~~text
for shard in 0..15:
    SELECT ... WHERE account_id=? AND event_day=? AND shard=?
                 AND event_time>=? AND event_time<?
~~~

The client then performs a k-way merge by <code>(event_time, event_id)</code>. Define:

- maximum days per request;
- maximum concurrent shard queries;
- per-query and overall deadlines;
- partial-failure behavior;
- deterministic tie-breaking;
- page-token contents;
- per-shard fetch size and global limit.

A global <code>LIMIT 100</code> cannot be applied independently as “return the first 100 from each shard and concatenate.” That returns up to 1,600 rows and incorrect global order. Fetch candidates, merge, and encode each shard's paging state plus the last emitted sort key. Page tokens may be large and version-specific; treat them as opaque, authenticated application state.

Fan-out is a trade: salting lowers per-partition load while raising coordinator/client work. Increase buckets only until the hottest physical partition meets its objective.

## Recognize Lost Single-Partition Guarantees

Cassandra localizes rows sharing a partition key and supports atomic, isolated mutations within one partition. Salting turns one logical account-day into 16 CQL partitions. Operations spanning all shards are no longer single-partition operations.

This affects:

- lightweight transactions and compare-and-set;
- counters or summaries expected to update atomically;
- static columns, which are static only within a CQL partition;
- logged batches across shards;
- reads that assumed one clustering order.

Keep coordination-sensitive state in a separate unsalted table if one small partition can safely own it, or redesign the invariant. Do not hide a cross-bucket transaction behind a loop.

## Salt Only What Is Hot

Uniformly assigning 64 buckets to every account creates many tiny partitions and expensive reads for quiet accounts. Alternatives:

- one unsalted schema for normal accounts and a salted table for promoted hot accounts;
- a routing table specifying each account's bucket count;
- bucket count based on a stable account tier;
- upstream batching or aggregation that lowers writes before Cassandra.

The reader must know which layout to query. A routing record should be cached but have a version and safe refresh behavior.

## Version Bucket-Count Changes

Changing <code>mod 16</code> to <code>mod 32</code> remaps many IDs. If writers switch instantly, a logical day can exist under both layouts and readers using only one count miss rows.

Safe options include:

1. keep the bucket count immutable for a table;
2. introduce a new table version and backfill;
3. assign a bucket-count generation by time boundary;
4. store routing generation with each lookup record;
5. during migration, read old and new generations and deduplicate.

For time-bucketed data, a clean rule can be:

~~~text
days before 2026-09-01 -> 16 shards
days on/after 2026-09-01 -> 32 shards
~~~

Late events need a documented choice: route by event day to the old generation, or by ingestion generation with a lookup. Never infer the count from today's configuration alone.

## Validate Under Skew

Load test with the real hottest logical key:

- per-physical-key writes and reads;
- replica CPU and disk latency;
- p95/p99 client latency;
- timeout and retry amplification;
- compaction and SSTables per read;
- fan-out concurrency;
- merge CPU and memory;
- maximum page-token size;
- one shard or replica unavailable;
- bucket-generation transition.

Use <code>nodetool tablehistograms</code> and table metrics on every node. Hash distribution is probabilistic over distinct salted keys; inspect actual endpoints instead of assuming all 16 land on disjoint nodes.

## Official Documentation

- [Apache Cassandra: Dataset Partitioning and Consistent Hashing](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: CQL Partition Keys](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: Evaluating and Refining Data Models](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html)
- [Apache Cassandra: Monitoring Metrics](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html)
- [Apache Cassandra: nodetool Commands](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/nodetool.html)
- [Apache Cassandra: Denylisting Partitions](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/denylisting_partitions.html)
- [Apache Cassandra: CQL BATCH Semantics](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/cql_singlefile.html#batch)
- [Apache Cassandra: Data Modeling Overview](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html)

## Conclusion

Consistent hashing balances many keys; it cannot divide one hot key. Split a proven hot logical key with a deterministic, specified shard and a bounded time bucket, then design point routing, fan-out merge, paging, and failure behavior. Salting sacrifices single-partition guarantees and makes bucket count part of stored-data compatibility. Use the fewest buckets that meet peak load, version every count change, and validate actual replica placement under the hottest real key.
