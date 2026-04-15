# How to Monitor Part Merges in MergeTree Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Monitoring, Part, Merge, system.parts, Performance

Description: Learn how to monitor ClickHouse MergeTree part merges using system tables to detect merge lag, high part counts, and background merge health.

---

ClickHouse MergeTree continuously merges small data parts in the background. When merges fall behind inserts - typically on high-throughput write workloads - the part count rises, queries slow down, and inserts eventually get throttled. Monitoring merge health is essential for maintaining a healthy ClickHouse cluster.

## Key System Tables for Merge Monitoring

```text
system.parts     -- all data parts (active and inactive)
system.merges    -- currently running merges
system.mutations -- running or completed mutations (ALTER UPDATE/DELETE)
system.events    -- counters for merge-related events
system.metrics   -- real-time metric gauges
```

## Checking Active Part Count per Table

A healthy table should have well under 150 active parts per partition. ClickHouse starts delaying inserts at 150 parts per partition (`parts_to_delay_insert`) and rejects them entirely at 300 (`parts_to_throw_insert`).

```sql
SELECT
    database,
    table,
    partition,
    count()                           AS part_count,
    sum(rows)                         AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
ORDER BY part_count DESC
LIMIT 20;
```

## Watching Active Merges

```sql
SELECT
    table,
    partition,
    result_part_name,
    round(elapsed, 1)                         AS elapsed_sec,
    round(progress * 100, 1)                  AS pct_done,
    num_parts,
    formatReadableSize(total_size_bytes_compressed) AS total_size,
    formatReadableSize(memory_usage)          AS memory_usage
FROM system.merges
ORDER BY elapsed DESC;
```

## Detecting Merge Lag

If part count grows over time despite active merges, merges are not keeping up:

```sql
-- Compare current vs expected part count trend
SELECT
    table,
    partition,
    count() AS part_count
FROM system.parts
WHERE active = 1
  AND table = 'events'
GROUP BY table, partition
ORDER BY partition DESC;
```

If you see dozens of parts accumulating in the most recent partition, insert rate exceeds merge throughput.

## Merge Event Counters

```sql
SELECT event, value
FROM system.events
WHERE event IN (
    'MergedRows',
    'MergedUncompressedBytes',
    'MergesTimeMilliseconds',
    'MergeTreeDataWriterRows'
)
ORDER BY event;
```

## Real-Time Merge Metrics

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN (
    'BackgroundMergesAndMutationsPoolTask',
    'BackgroundMovePoolTask',
    'BackgroundFetchesPoolTask'
);
```

`BackgroundMergesAndMutationsPoolTask` shows how many merge/mutation slots are currently occupied.

## Merge History from system.part_log

```sql
SELECT
    event_type,
    table,
    part_name,
    rows,
    formatReadableSize(size_in_bytes) AS size,
    duration_ms
FROM system.part_log
WHERE event_type = 'MergeParts'
  AND table = 'events'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Alerting on Part Count

Set up a monitoring query to alert when parts exceed a threshold:

```sql
SELECT
    table,
    max(part_count) AS max_parts_per_partition
FROM (
    SELECT table, partition, count() AS part_count
    FROM system.parts
    WHERE active = 1
    GROUP BY table, partition
)
GROUP BY table
HAVING max_parts_per_partition > 300;
```

## Triggering Manual Merges

If background merges are too slow, you can trigger a manual merge for a specific partition:

```sql
OPTIMIZE TABLE events PARTITION 202603;
```

In production, use sparingly - manual OPTIMIZE competes with background merges and can block inserts.

## Summary

Monitor MergeTree merge health by watching part counts per partition in `system.parts`, active merge progress in `system.merges`, and merge event rates in `system.events`. Alert when part count per partition exceeds 300 parts. Tune `background_pool_size` and insert batch sizes to keep merges ahead of inserts, and use OPTIMIZE as a last resort for emergency compaction.
