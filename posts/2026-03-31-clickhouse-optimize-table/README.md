# How to Use OPTIMIZE TABLE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, OPTIMIZE TABLE, MergeTree, Compaction

Description: Learn how to trigger manual merges in ClickHouse with OPTIMIZE TABLE, including the FINAL option, partition-scoped compaction, and when to use it in production.

---

ClickHouse MergeTree tables store data in immutable parts that are periodically merged in the background. OPTIMIZE TABLE lets you trigger a merge manually, which is useful after large bulk inserts, before taking a backup, or when you need to ensure deduplication has run. This post explains the full syntax, the FINAL option, partition-level control, and the performance trade-offs involved.

## Basic OPTIMIZE TABLE Syntax

```sql
OPTIMIZE TABLE analytics.events;
```

This asks ClickHouse to merge parts in the table. It is not guaranteed to merge everything into a single part - ClickHouse picks a merge candidate based on the same heuristics it uses for background merges. For non-replicated MergeTree tables, the statement is synchronous and blocks until the merge completes.

### Non-Blocking Mode for Replicated Tables

For ReplicatedMergeTree tables, the `alter_sync` setting controls whether OPTIMIZE waits for the merge to finish. By default it waits on the initiator replica. To return immediately and let the merge happen in the background:

```sql
OPTIMIZE TABLE analytics.events SETTINGS alter_sync = 0;
```

## OPTIMIZE TABLE FINAL

The FINAL modifier forces ClickHouse to merge all parts in the table (or partition) into a single part, even if there is only one part remaining:

```sql
OPTIMIZE TABLE analytics.events FINAL;
```

This is the only way to guarantee:
- ReplacingMergeTree deduplication has fully applied
- AggregatingMergeTree pre-aggregation is complete
- SummingMergeTree row summation is complete

FINAL is expensive on large tables because it reads and rewrites all data. Use it sparingly - for example, after a bulk historical backfill when you need clean query results before the background merges catch up.

## OPTIMIZE TABLE PARTITION

To limit the merge to a single partition rather than the entire table, add the PARTITION clause:

```sql
-- Merge only the February 2026 partition
OPTIMIZE TABLE analytics.events PARTITION '2026-02';

-- Force a full merge of a single partition
OPTIMIZE TABLE analytics.events PARTITION '2026-02' FINAL;
```

This is significantly cheaper than FINAL on the whole table and is the recommended approach when you only need deduplication to run on a specific time window.

## ON CLUSTER

```sql
OPTIMIZE TABLE analytics.events ON CLUSTER my_cluster FINAL;
```

Sends the OPTIMIZE command to every shard in the named cluster. For ReplicatedMergeTree tables, running OPTIMIZE on one replica is typically sufficient because replicas stay in sync, but ON CLUSTER ensures all shards are covered.

## When to Use OPTIMIZE TABLE

| Scenario | Recommended command |
|----------|-------------------|
| After a large bulk insert | `OPTIMIZE TABLE t;` |
| Force deduplication (ReplacingMergeTree) | `OPTIMIZE TABLE t FINAL;` |
| Clean up a single partition | `OPTIMIZE TABLE t PARTITION 'p' FINAL;` |
| Pre-backup compaction | `OPTIMIZE TABLE t FINAL;` |
| Routine maintenance | Let background merges handle it |

Do not run OPTIMIZE TABLE FINAL on large tables in production during peak hours. It is CPU- and I/O-intensive and competes with insert and query workloads.

## Checking Merge Progress

```sql
-- See active merges
SELECT
    database,
    table,
    result_part_name,
    progress,
    elapsed
FROM system.merges
WHERE database = 'analytics'
  AND table = 'events';
```

```sql
-- Count parts per partition after optimization
SELECT
    partition,
    count() AS part_count,
    sum(rows) AS total_rows
FROM system.parts
WHERE database = 'analytics'
  AND table = 'events'
  AND active
GROUP BY partition
ORDER BY partition;
```

## Practical Example

```sql
-- Backfill historical data
INSERT INTO analytics.events
SELECT * FROM raw.events_archive WHERE created_at < '2025-01-01';

-- Force deduplication on the backfilled partition
OPTIMIZE TABLE analytics.events PARTITION '2024-12' FINAL;

-- Verify parts were merged
SELECT partition, count() AS part_count
FROM system.parts
WHERE database = 'analytics'
  AND table = 'events'
  AND partition = '2024-12'
  AND active
GROUP BY partition;
```

## Summary

OPTIMIZE TABLE in ClickHouse triggers a manual merge of data parts and is most valuable after bulk inserts or when you need deduplication to complete before querying. The FINAL option forces a full merge to a single part and is essential for ReplacingMergeTree and AggregatingMergeTree correctness, but it carries significant I/O cost on large tables. Scope your compaction to specific partitions whenever possible to minimize impact.
