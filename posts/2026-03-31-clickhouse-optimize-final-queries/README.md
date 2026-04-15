# How to Optimize ClickHouse FINAL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, FINAL, ReplacingMergeTree, Query Optimization, Deduplication

Description: Learn how to optimize ClickHouse queries that use the FINAL modifier for deduplication, including alternatives and settings that reduce FINAL overhead.

---

The `FINAL` modifier in ClickHouse forces full deduplication at query time, merging all parts to return the latest version of each row. This is necessary for `ReplacingMergeTree` and `CollapsingMergeTree` tables but can be slow on large datasets.

## Why FINAL Is Slow

`FINAL` requires ClickHouse to read all data parts for a table (or partition) and merge them in memory to resolve duplicates. In versions prior to 23.3, this was a single-threaded operation by default. Since ClickHouse 23.3, FINAL runs in parallel using all available CPU cores by default.

## Basic FINAL Usage

```sql
SELECT user_id, name, status
FROM user_profiles FINAL
WHERE updated_at >= today() - 7;
```

## Enable Parallel FINAL

ClickHouse 20.5+ supports parallel FINAL processing via the `max_final_threads` setting. Since ClickHouse 23.3, this defaults to the number of CPU cores. To explicitly control the thread count:

```sql
SET max_final_threads = 4;

SELECT * FROM user_profiles FINAL;
```

Or configure globally in `users.xml`:

```xml
<max_final_threads>4</max_final_threads>
```

## Using do_not_merge_across_partitions_select_final

When querying a single partition, this avoids cross-partition merging:

```sql
SET do_not_merge_across_partitions_select_final = 1;

SELECT * FROM user_profiles FINAL
WHERE toYYYYMM(updated_at) = 202601;
```

## Alternative: LIMIT BY for Latest Row

For `ReplacingMergeTree`, use `LIMIT 1 BY` as a FINAL alternative when you control the query:

```sql
SELECT
    user_id,
    name,
    status,
    updated_at
FROM (
    SELECT * FROM user_profiles ORDER BY updated_at DESC
)
LIMIT 1 BY user_id;
```

This is often faster than `FINAL` because it allows parallel processing.

## Alternative: argMax for Latest Value

```sql
SELECT
    user_id,
    argMax(status, updated_at) AS current_status,
    max(updated_at) AS last_update
FROM user_profiles
GROUP BY user_id;
```

## Force Merges to Reduce FINAL Work

The fewer unmerged parts, the faster FINAL runs:

```sql
OPTIMIZE TABLE user_profiles FINAL;
```

Run during off-peak hours to pre-merge data.

## Partitioned FINAL Queries

Partition by a time column and query one partition at a time:

```sql
-- Query just the current month's data with FINAL
SELECT * FROM user_profiles FINAL
WHERE toYYYYMM(updated_at) = toYYYYMM(now());
```

## Monitoring FINAL Overhead

```sql
SELECT
    query,
    query_duration_ms,
    read_rows,
    read_bytes
FROM system.query_log
WHERE query LIKE '%FINAL%'
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Summary

FINAL queries in ClickHouse are necessary for correctness with deduplication tables but carry overhead. Use parallel FINAL settings, per-partition queries, forced merges, and LIMIT BY alternatives to reduce their cost in production.
