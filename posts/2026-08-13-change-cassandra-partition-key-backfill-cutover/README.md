# Can You Change a Cassandra Partition Key? Replace, Backfill, and Cut Over

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Cassandra, Partition Keys, Schema Migration, Data Backfill, Cutover, CQL

Description: Change a Cassandra partition key by designing a replacement table, preserving write and TTL semantics during backfill, validating both models, and cutting reads over safely.

---

Apache Cassandra does not let <code>ALTER TABLE</code> change a primary key. The partition key determines token placement, and clustering columns determine row identity and ordering within that partition; changing either changes the physical and logical data model. The migration is a new table, a new write path, a backfill, and a read cutover.

The difficult part is not creating the table. It is ensuring that updates, deletes, timestamps, and TTLs occurring during the copy produce the same final state in both models.

## State Why the Old Key Failed

Measure before redesigning:

- largest partition bytes and cell counts;
- top read and write partition keys;
- table read/write latency and timeouts by node;
- SSTables per read and compaction backlog;
- queries that omit the current partition key or use <code>ALLOW FILTERING</code>;
- expected growth and retention.

Apache Cassandra exposes partition-size histograms and table latency metrics. <code>nodetool tablehistograms</code>, <code>tablestats</code>, and <code>toppartitions</code> add operational views. Because metrics are node-local, inspect all replicas and aggregate externally.

Write a concrete failure:

~~~text
Old partition key: tenant_id
Largest tenant: 420 GB, 18% of writes
Required query: tenant + 24-hour time range
Retention: 90 days
~~~

The replacement must address that distribution without breaking the required query.

## Design the Replacement From Queries

Old table:

~~~sql
CREATE TABLE events_by_tenant (
    tenant_id text,
    event_time timestamp,
    event_id timeuuid,
    payload text,
    PRIMARY KEY (tenant_id, event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);
~~~

All history for one tenant shares one partition. A bounded replacement:

~~~sql
CREATE TABLE events_by_tenant_day_v2 (
    tenant_id text,
    event_day date,
    shard tinyint,
    event_time timestamp,
    event_id timeuuid,
    payload text,
    PRIMARY KEY ((tenant_id, event_day, shard), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);
~~~

The double parentheses make <code>(tenant_id, event_day, shard)</code> the composite partition key. A stable function of <code>event_id</code> assigns <code>shard</code>. Reads calculate covered days and shards, query them, and merge clustering order.

Before creating it, specify:

- exact day time zone;
- stable hash and bucket count;
- maximum read window and fan-out;
- page-token format;
- duplicate identity;
- TTL and deletion semantics;
- whether late data uses event day or ingestion day.

Cassandra encourages tables per query. If another query needs lookup by event ID, create a separate <code>event_by_id</code> table rather than relying on a full scan.

## Inventory Data Semantics

Cassandra resolves cells by mutation timestamps. TTLs are also part of cell lifecycle, and deletes create tombstones. A migration that copies only visible values with new default timestamps can produce a different winner:

~~~text
T1: backfill reads old value A
T2: application writes new value B to v2
T3: backfill writes A to v2 with a later server timestamp
result: A can win even though it is stale
~~~

Similarly, copying an original 30-day TTL as a fresh 30-day TTL extends retention. Missing a delete can resurrect data when a later backfill write reaches the target.

Define how the copier handles:

- per-column write timestamps;
- remaining TTL rather than original TTL;
- row and partition deletes;
- static columns;
- collections and element timestamps;
- counters, which are not ordinary idempotent values;
- lightweight transactions;
- materialized views and secondary indexes.

CQL exposes <code>WRITETIME</code> and <code>TTL</code> for applicable selected columns, but a general table can have different metadata per cell. A migration tool must be schema-aware; one timestamp per row is not universally equivalent.

## Establish an Ordered Change Boundary

A correct online migration needs:

1. a known point after which source changes are captured;
2. a scan of source state;
3. replay of later mutations into the target without letting stale backfill win;
4. continuing synchronization through cutover.

Possible mechanisms include an application dual-write path, a durable application event log, or Cassandra CDC consumed by a purpose-built process. Apache Cassandra's CDC writes commit-log segments for enabled tables to a CDC area, but operators must provision and consume it: when configured CDC space is exhausted, writes to CDC-enabled tables are rejected. Enabling CDC is not a complete migration pipeline.

Full Query Logging records successful CQL requests and supports replay/testing uses, but failed or timed-out requests are not logged. It should not be casually treated as a lossless CDC stream.

Whichever mechanism is chosen, persist offsets and make target mutations idempotent. Rehearse consumer restart, duplicate delivery, source replica failure, and schema change.

## Be Precise About Dual Writes

Writing old and new tables in two independent driver calls can partially succeed. Retrying both is safe only for idempotent mutations with deliberate timestamps; counters are notably non-idempotent.

A logged CQL batch can group mutations so all eventually complete or none, but Cassandra documentation emphasizes:

- isolation applies only to mutations in one partition;
- cross-partition batches carry a performance penalty;
- batches are not full SQL transactions;
- timestamp ties can resolve in an order different from statement order.

Because old and new partition keys hash differently, the two mutations are likely cross-partition. Load-test the batchlog cost and decide whether a durable application retry/outbox is more controllable.

Keep the old write successful state as the source of truth until target lag and conflicts are observable. Emit an explicit metric for “old succeeded, new pending” instead of hiding it in generic errors.

## Backfill in Token-Aware, Restartable Work

A full unbounded <code>SELECT * FROM table</code> is not a production migration strategy. Split work by source token ranges or another stable source key, page results, limit concurrency, and checkpoint completed ranges.

The target write key is derived per row:

~~~text
event_day = date_utc(event_time)
shard = stable_hash(event_id_bytes) mod 16
~~~

Use prepared statements and bounded asynchronous concurrency. Monitor coordinator and replica latency, timeouts, pending compactions, dropped messages, disk use, and streaming/repair activity. Backfill traffic competes with application traffic and generates target compaction work.

Apache Cassandra's bulk-loading documentation says <code>cqlsh COPY</code> is not a good choice for large amounts of data. <code>sstableloader</code> and <code>nodetool import</code> load SSTables. For a changed primary key, source SSTables do not already have the target row/token layout; a bulk path is valid only if an approved transformation produces SSTables for the exact target schema.

## Validate Both Content and Distribution

Global counts are weak in a distributed eventually consistent system. Validate:

- counts by tenant and day from an independent source or bounded scans;
- deterministic samples of primary keys and every column;
- maximum, p99, and median target partition sizes;
- top target read/write partitions;
- TTL expiration times for sampled cells;
- deleted-key absence after replay catches up;
- target query results and global ordering;
- secondary lookup consistency;
- read and write latency under peak traffic.

Run validation at an appropriate consistency level and document it. A low consistency read can observe one stale replica and falsely report a mismatch. Repair state and consistency policy matter.

Shadow reads can query both tables for a sampled fraction of production requests, normalize order, and compare results without returning v2 to the caller. Protect latency with strict deadlines and do not double load the cluster indiscriminately.

## Cut Over in Stages

A controlled sequence:

1. deploy code that understands v1 and v2 routing;
2. enable durable synchronization to v2;
3. backfill and replay until lag is bounded;
4. run content, TTL, deletion, and distribution validation;
5. enable sampled shadow reads;
6. switch a small tenant cohort to v2 reads;
7. increase cohorts while continuing writes to both;
8. make v2 the read default;
9. retain dual writes through a defined rollback window;
10. stop v1 writes only after rollback no longer requires them;
11. wait through repair, backup, and policy checks before dropping v1.

Keep schema names versioned. Renaming tables to simulate an in-place key change makes prepared statements and rollback harder to reason about.

Rollback after v2-only writes requires reverse synchronization. If no reverse path exists, the rollback point ends when v1 stops receiving changes; publish that deadline.

## Official Documentation

- [Apache Cassandra: ALTER TABLE](https://cassandra.apache.org/doc/stable/cassandra/reference/cql-commands/alter-table.html)
- [Apache Cassandra: CQL Data Definition and Primary Keys](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: Evaluating and Refining Data Models](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html)
- [Apache Cassandra: Data Manipulation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra: CQL BATCH](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/cql_singlefile.html#batch)
- [Apache Cassandra: Bulk Loading](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bulk_loading.html)
- [Apache Cassandra: Monitoring Metrics](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html)
- [Apache Cassandra: Full Query Logging](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/fqllogging.html)
- [Apache Cassandra: CREATE TABLE and CDC](https://cassandra.apache.org/doc/stable/cassandra/reference/cql-commands/create-table.html)

## Conclusion

A Cassandra partition key cannot be altered; replace the table with a query-driven schema. Establish an ordered change boundary, preserve timestamps, remaining TTLs, and deletes, backfill in restartable source ranges, and validate both values and target distribution. Cut reads over by cohort while both write paths remain available. The migration is complete only when rollback, repair, backup, and old-table retirement are explicitly resolved.
