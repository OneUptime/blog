# How to Monitor ClickHouse Background Merges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Background Merge, Monitoring, MergeTree, Performance

Description: Learn how to monitor ClickHouse background merge operations using system tables and metrics to detect merge backlogs and optimize table performance.

---

## Why Monitor Background Merges

ClickHouse's MergeTree engine relies on background merge operations to consolidate data parts, apply mutations, and maintain table health. Too many small parts slow down queries; too few merges indicate a bottleneck. Monitoring merges ensures your tables stay in a healthy state.

## Checking Active Background Merges

```sql
SELECT
    database,
    table,
    num_parts,
    source_part_names,
    result_part_name,
    elapsed,
    progress,
    rows_read,
    rows_written,
    formatReadableSize(total_size_bytes_compressed) AS size
FROM system.merges
ORDER BY elapsed DESC;
```

## Counting Parts Per Table

High part counts (>300 per partition) indicate merge lag:

```sql
SELECT
    database,
    table,
    partition,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING parts > 50
ORDER BY parts DESC;
```

## Monitoring Merge Progress Over Time

```sql
SELECT
    database,
    table,
    toStartOfMinute(event_time) AS minute,
    countIf(event_type = 'MergeParts') AS merges_finished,
    sum(size_in_bytes) AS bytes_merged
FROM system.part_log
WHERE event_date >= today() - 1
  AND event_type = 'MergeParts'
GROUP BY database, table, minute
ORDER BY minute DESC;
```

## Checking the Merge Pool Utilization

```sql
-- Check how many merge workers are active vs available
SELECT
    metric,
    value
FROM system.metrics
WHERE metric = 'BackgroundMergesAndMutationsPoolTask';
```

## Detecting Merge Bottlenecks

```sql
-- Tables with highest part count (potential merge backlog)
SELECT
    database,
    table,
    count() AS total_parts,
    countIf(active = 1) AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
GROUP BY database, table
ORDER BY active_parts DESC
LIMIT 20;
```

## Merge Performance Metrics

```sql
-- Average merge duration and size over the last 24 hours
SELECT
    database,
    table,
    count() AS merge_count,
    avg(duration_ms) AS avg_duration_ms,
    formatReadableSize(avg(size_in_bytes)) AS avg_merge_size,
    formatReadableSize(sum(size_in_bytes)) AS total_merged
FROM system.part_log
WHERE event_type = 'MergeParts'
  AND event_date >= today() - 1
GROUP BY database, table
ORDER BY sum(size_in_bytes) DESC;
```

## Checking for Failed Merges

```sql
SELECT
    event_time,
    database,
    table,
    error,
    exception
FROM system.part_log
WHERE event_type = 'MergeParts'
  AND error != 0
  AND event_date >= today() - 7
ORDER BY event_time DESC
LIMIT 20;
```

## Configuring Background Merge Threads

Increase merge parallelism in `config.xml`:

```xml
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

After editing the config, apply the change without a full restart (increases take effect; decreases still require a restart):

```sql
SYSTEM RELOAD CONFIG;
```

## Forcing a Manual Merge

```sql
-- Merge all parts in a table
OPTIMIZE TABLE my_table FINAL;

-- Merge a specific partition by ID
OPTIMIZE TABLE my_table PARTITION ID '202603' FINAL;
```

## Prometheus Metric for Merges

If Prometheus is configured, watch:

```text
ClickHouseMetrics_BackgroundMergesAndMutationsPoolTask
ClickHouseProfileEvents_MergedRows
ClickHouseProfileEvents_MergedUncompressedBytes
```

## Summary

Monitor background merges in ClickHouse using `system.merges` for active operations, `system.parts` for part count per partition, and `system.part_log` for historical merge performance. A healthy table keeps active parts per partition below 50-100. If parts accumulate, increase `background_pool_size`, investigate failed merges, or check for mutations blocking the merge queue.
