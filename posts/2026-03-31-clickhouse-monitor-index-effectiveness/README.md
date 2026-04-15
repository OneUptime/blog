# How to Monitor Index Usage and Effectiveness in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, Monitoring, EXPLAIN, system.query_log

Description: Learn how to monitor and measure the effectiveness of primary and skip indexes in ClickHouse using EXPLAIN, query logs, and system tables.

---

## Why Monitor Index Effectiveness

Indexes in ClickHouse can be invalidated by poor query patterns, wrong key order, or missing skip indexes. Regular monitoring ensures your indexes are actually being used and provides data to justify adding or removing them.

## Use EXPLAIN to Check Index Usage

```sql
EXPLAIN indexes = 1
SELECT sum(value)
FROM events
WHERE user_id = 42
  AND ts >= '2026-01-01';
```

Sample output:

```text
ReadFromMergeTree
  Indexes:
    PrimaryKey
      Keys:
        user_id
        ts
      Condition: and((user_id in [42, 42]), (ts in [1735689600, +Inf)))
      Parts: 2/12
      Granules: 5/1440
```

`Parts: 2/12` means 2 of 12 parts were read - the index is working.

## Check system.query_log for Index Stats

```sql
SELECT
    query,
    read_rows,
    read_bytes,
    result_rows,
    ProfileEvents['SelectedParts'] AS parts_selected,
    ProfileEvents['SelectedRanges'] AS ranges_selected,
    ProfileEvents['SelectedMarks'] AS marks_selected
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%events%'
ORDER BY event_time DESC
LIMIT 10;
```

## Granule Skipping Ratio

```sql
SELECT
    query,
    ProfileEvents['SelectedMarks'] AS marks_read,
    ProfileEvents['SelectedMarksTotal'] AS marks_total,
    round((ProfileEvents['SelectedMarksTotal'] - ProfileEvents['SelectedMarks'])
      / ProfileEvents['SelectedMarksTotal'] * 100, 1) AS skip_pct
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%events%'
ORDER BY event_time DESC
LIMIT 5;
```

High `skip_pct` means indexes are effective.

## Monitor Skip Index Usage

Check which skip indexes exist on a table:

```sql
SELECT
    table,
    name,
    type,
    expr,
    granularity
FROM system.data_skipping_indices
WHERE database = 'default';
```

## Measure Skip Index Effectiveness

```sql
SELECT
    query,
    ProfileEvents['SelectedMarksTotal'] AS total_marks,
    ProfileEvents['SelectedMarks'] AS marks_after_primary,
    ProfileEvents['SelectedMarksTotal'] - ProfileEvents['SelectedMarks'] AS skipped_marks
FROM system.query_log
WHERE type = 'QueryFinish'
  AND has(tables, 'default.logs')
ORDER BY event_time DESC
LIMIT 10;
```

## Part-Level Index Stats

```sql
SELECT
    part_name,
    marks,
    primary_key_bytes_in_memory,
    secondary_indices_compressed_bytes,
    secondary_indices_uncompressed_bytes
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY marks DESC
LIMIT 10;
```

## Identify Queries Without Index Usage

```sql
SELECT
    query,
    read_rows,
    result_rows,
    round(read_rows / result_rows, 0) AS read_to_result_ratio
FROM system.query_log
WHERE type = 'QueryFinish'
  AND tables[1] = 'default.events'
  AND read_rows > 10000000
ORDER BY read_rows DESC
LIMIT 10;
```

A very high `read_to_result_ratio` indicates full or near-full table scans.

## Summary

Monitor ClickHouse index effectiveness using `EXPLAIN indexes = 1` for individual queries, `system.query_log` ProfileEvents for aggregate statistics, and `system.parts` for index memory footprint. Track `SelectedMarksTotal` and `SelectedMarks` to measure how well your indexes skip irrelevant data.
