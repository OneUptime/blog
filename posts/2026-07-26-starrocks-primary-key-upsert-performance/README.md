# StarRocks Primary Key Upserts Are Slow: Index and Compaction Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Primary Key Table, Upsert, Persistent Index, Compaction

Description: Diagnose slowing StarRocks Primary Key upserts by separating primary-index pressure, small-batch version growth, compaction backlog, distribution skew, and schema mistakes.

---

Primary Key upserts do more than append a row. StarRocks locates the previous row through the primary-key index, marks that row as deleted in a DelVector, writes the replacement row to a new data file, and updates the index to point to the replacement. Compaction later merges rowsets from different data-file versions, reducing the number of small files.

When upserts slow, increasing load concurrency can make the feedback loop worse:

```text
more small concurrent batches
→ more rowsets and versions
→ more index/apply work and compaction
→ higher compaction score or version count
→ delayed commits or rejected loads
```

Diagnose the stage that is slow before changing global thread counts or thresholds.

## Classify the Delay

Record whether time is spent:

- sending or parsing the load;
- waiting to commit/publish;
- applying the upsert on BEs/CNs;
- waiting behind compaction throttling;
- retrying failed transactions;
- updating one hot partition or tablet.

For shared-data clusters, inspect running transaction messages:

```sql
SHOW PROC '/transactions/analytics/running';
```

An entry in the transaction's `Reason` field such as:

```text
Partition's compaction score is larger than 100.0,
delay commit for ... ms
```

identifies deliberate ingestion slowdown.

Shared-data can eventually reject a load because the compaction score is too large. Shared-nothing clusters can report:

```text
Failed to load data into tablet ... because of too many versions
```

These messages are not generic network slowness. They say compaction is not keeping up with the version creation rate.

Also capture load status, labels, batch rows/bytes, frequency, retries, and the exact partition/tablet named by the error.

## Inspect the Live Schema

```sql
SHOW CREATE TABLE analytics.orders_current;

SELECT TABLE_MODEL, PRIMARY_KEY, PARTITION_KEY,
       DISTRIBUTE_TYPE, DISTRIBUTE_KEY, DISTRIBUTE_BUCKET,
       SORT_KEY, PROPERTIES
FROM information_schema.tables_config
WHERE TABLE_SCHEMA = 'analytics'
  AND TABLE_NAME = 'orders_current';
```

Verify:

- `TABLE_MODEL` is `PRI_KEYS`;
- the primary key represents stable row identity;
- partitioning and bucketing columns are included in the primary key;
- the key is not unnecessarily wide;
- the hash-distribution key has enough cardinality;
- the sort key reflects query filters rather than being confused with identity;
- persistent-index properties match the cluster architecture and version.

StarRocks documents a default maximum encoded primary-key length of 128 bytes. Wide strings cost index memory and comparison work. Prefer compact numeric identifiers when the source contract permits it.

## Check for an Accidental Ever-Growing Key

This schema does **not** update one logical order:

```sql
PRIMARY KEY(order_id, updated_at)
```

Every timestamp creates a different key, so rows append instead of replacing. If the goal is current state, keep mutable version/time columns out of identity unless the load semantics explicitly need them.

Conversely, StarRocks requires partition and bucket columns in the primary key. If monthly partitioning uses `order_date`, moving an order between partition dates is not a simple update to the same physical key. Model immutable routing fields carefully and test the source's correction behavior.

## Inspect Primary-Key Memory

On a BE:

```text
http://<be-host>:<be-http-port>/mem_tracker?type=update
http://<be-host>:<be-http-port>/mem_tracker?type=update&upper_level=4
```

The `update` tracker includes primary-key index, delete-vector, and related memory. Compare nodes. One outlier can indicate skew or a hot tablet rather than a cluster-wide shortage.

Persistent indexes trade memory pressure for local disk or object-storage I/O depending on architecture and version. Confirm the effective table properties with `SHOW CREATE TABLE`; do not assume a property in a migration template was applied.

The BE parameter `l0_max_mem_usage` controls maximum L0 persistent-index memory per tablet. Lowering it can reduce memory usage but increases I/O pressure. Likewise:

- `transaction_apply_worker_count` controls shared-nothing upsert/delete apply concurrency;
- `transaction_publish_version_worker_count` serves the corresponding shared-data path.

Reducing workers lowers memory/CPU concurrency but can slow ingestion. Raising them can starve queries or compaction. Change only after profiles identify the apply stage and capacity tests show headroom.

## Fix Batch Shape Before Raising Limits

Tiny frequent loads create many rowsets and versions. Measure:

```text
rows per commit
bytes per commit
commits per second
concurrent load tasks
retry percentage
```

Then:

- combine records into larger batches;
- reduce simultaneous jobs targeting the same partition/tablet;
- increase Routine Load consumption/batch settings through the documented load-specific controls;
- eliminate blind client retries that create more work;
- group updates by routing key where the connector allows it.

Larger batches can increase single-task memory and end-to-end freshness latency, so benchmark the trade-off. The goal is fewer versions per useful amount of data, not the largest possible transaction.

## Inspect Distribution and Hot Partitions

Primary Key tables use hash bucketing. Low-cardinality or skewed distribution keys concentrate:

- index updates;
- publish work;
- compaction;
- query scans.

Find heavy logical keys:

```sql
SELECT tenant_id, COUNT(*) AS rows_per_tenant
FROM analytics.orders_current
GROUP BY tenant_id
ORDER BY rows_per_tenant DESC
LIMIT 20;
```

Compare row counts and latency across tablets/nodes in load profiles and monitoring. More buckets do not fix a single hash value that dominates, because identical hash keys still land together. A composite distribution key can spread it, but must be included in the primary key and can weaken tenant-local joins and filters.

Time partitioning can keep frequently updated recent data separate from cold history. StarRocks' Primary Key documentation notes that historical partition indexes need not all be loaded for a workload updating only recent partitions. That benefit disappears if the source constantly rewrites old partitions.

## Determine Whether Compaction Has Capacity

Primary Key tables need additional compaction resources when they combine high-frequency writes, fresh reads, and low query latency.

Relevant parameters differ:

- shared-data: `compact_threads`;
- shared-nothing: `update_compaction_num_threads_per_disk` and `update_compaction_per_tablet_min_interval_seconds`.

Increasing compaction concurrency consumes CPU, memory, and storage bandwidth. First prove the disks and CPUs have room. Otherwise faster scheduling just makes query and ingestion I/O contend harder.

For a controlled intervention, current StarRocks supports manual compaction:

```sql
ALTER TABLE orders_current COMPACT;
ALTER TABLE orders_current COMPACT p202607;
```

Use it during a capacity-aware window and monitor completion. Manual compaction is not a substitute for fixing a sustained ingest/compaction imbalance.

Avoid treating these safety thresholds as tuning targets:

- `lake_ingest_slowdown_threshold`;
- `lake_compaction_score_upper_bound`;
- `tablet_max_versions`.

Raising them allows more outstanding files/versions but can worsen query latency and defer the same failure. StarRocks' own best-practice guidance frames this as a trade-off among compaction resources, freshness, and query latency.

## Check Source Ordering and Partial Updates

Retries and out-of-order CDC can waste work or overwrite newer state if sequence handling is wrong. Verify:

- the connector's primary key matches the table key;
- delete records use the documented operation column;
- partial update mode is intentional;
- missing columns mean "unchanged," default, or `NULL` as intended;
- source ordering/version columns reject or resolve stale events as designed;
- one logical stream is not duplicated by two jobs.

Load a small deterministic sequence in staging:

```text
insert v1 → partial update v2 → stale update v1 → delete → retry delete
```

Check the resulting row after every transaction.

## Apply Fixes in the Right Order

1. Correct identity, partition, distribution, and sort-key mistakes.
2. Remove duplicate jobs and unbounded retries.
3. Increase batch usefulness and reduce tiny commits.
4. Repair skew or hot-tablet routing.
5. Confirm persistent-index behavior and memory/I/O.
6. Allocate compaction/apply resources from measured headroom.
7. Change slowdown/version thresholds only with an explicit latency and recovery trade-off.

Retest both ingestion and queries. An upsert change that restores freshness by consuming every disk can create a different outage.

## Official Documentation

- [StarRocks Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table)
- [Primary Key table best practices](https://docs.starrocks.io/docs/best_practices/primarykey_table/)
- [Compaction for shared-data clusters](https://docs.starrocks.io/docs/administration/management/compaction/)
- [Information Schema `tables_config`](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
- [ALTER TABLE and manual compaction](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
