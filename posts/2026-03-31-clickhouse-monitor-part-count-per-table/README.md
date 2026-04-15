# How to Monitor ClickHouse Part Count Per Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Part, Monitoring, MergeTree, Performance

Description: Learn how to monitor data part counts per table in ClickHouse to detect merge issues, prevent too-many-parts errors, and optimize MergeTree settings.

---

ClickHouse uses a parts-based storage model where each INSERT creates one or more data parts. Background merge processes combine these parts over time. When merges fall behind ingestion, part counts rise - eventually causing the dreaded "Too many parts" error and degraded query performance.

## Querying Part Counts from system.parts

The `system.parts` table is your primary tool for monitoring part counts:

```sql
SELECT
    database,
    table,
    count() AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY active_parts DESC
LIMIT 20;
```

## Tracking Part Count History

ClickHouse logs part events to `system.part_log`. Query it to see how part counts have changed over time:

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    database,
    table,
    countIf(event_type = 'NewPart') AS parts_created,
    countIf(event_type = 'MergeParts') AS merges_completed,
    countIf(event_type = 'RemovePart') AS parts_removed
FROM system.part_log
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour, database, table
ORDER BY hour, table;
```

## Detecting Tables Approaching the Limit

ClickHouse throttles inserts when a partition exceeds `parts_to_delay_insert` (default 1000) active parts, and throws a "Too many parts" error at `parts_to_throw_insert` (default 3000). A separate setting `max_parts_in_total` (default 100000) limits total parts across all partitions. Alert well before you hit these limits:

```sql
SELECT
    database,
    table,
    partition,
    count() AS parts_in_partition
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING parts_in_partition > 100
ORDER BY parts_in_partition DESC;
```

## Monitoring Merge Progress

Check the current merge queue to see whether ClickHouse is keeping up:

```sql
SELECT
    database,
    table,
    result_part_name,
    elapsed,
    progress,
    formatReadableSize(total_size_bytes_compressed) AS size
FROM system.merges
ORDER BY elapsed DESC;
```

A long merge queue with low progress indicates merges are overwhelmed by ingestion rate.

## Checking Part Age

Old unmerged parts indicate stalled merges:

```sql
SELECT
    database,
    table,
    min(modification_time) AS oldest_part_time,
    dateDiff('hour', min(modification_time), now()) AS age_hours,
    count() AS part_count
FROM system.parts
WHERE active = 1
GROUP BY database, table
HAVING age_hours > 24
ORDER BY age_hours DESC;
```

## Configuring MergeTree to Reduce Parts

If part counts are consistently high, tune the merge settings:

```sql
ALTER TABLE my_table
MODIFY SETTING
    parts_to_delay_insert = 150,
    parts_to_throw_insert = 300,
    max_parts_in_total = 100000;
```

Reduce insert batch size or increase the merge thread pool:

```xml
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

## Summary

Monitoring part counts per table is essential for ClickHouse operational health. Query `system.parts` for current counts, `system.part_log` for historical trends, and `system.merges` for active merge progress. Alert when any partition exceeds 100-150 parts to catch problems before the "Too many parts" threshold blocks inserts.
