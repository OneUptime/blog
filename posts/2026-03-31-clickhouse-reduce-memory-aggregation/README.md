# How to Reduce Memory Usage in ClickHouse Aggregation Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory Optimization, Aggregation, GROUP BY, Performance

Description: Learn techniques to reduce memory usage in ClickHouse aggregation queries, including spill-to-disk, external aggregation, and query settings.

---

Aggregation queries on large datasets can consume significant memory in ClickHouse. Several strategies and settings help control memory footprint without sacrificing results.

## Understanding Memory in GROUP BY

ClickHouse aggregation builds a hash table in memory with one entry per unique key combination. High-cardinality keys (user_id, session_id) create large hash tables that can trigger memory limit errors.

## Enable External Aggregation (Spill to Disk)

Allow ClickHouse to spill aggregation data to disk when memory limits are reached:

```sql
SET max_bytes_before_external_group_by = 20000000000; -- 20GB

SELECT user_id, count()
FROM large_events
GROUP BY user_id;
```

Note: `max_bytes_before_external_group_by` is all you need to enable spill-to-disk. The separate setting `group_by_overflow_mode` controls behavior when `max_rows_to_group_by` is exceeded, and is not related to external aggregation.

## Set Memory Limits

```sql
SET max_memory_usage = 16000000000; -- 16GB per query
SET max_bytes_before_external_group_by = 8000000000; -- Spill after 8GB
```

## Use Two-Level Aggregation

ClickHouse automatically switches to two-level aggregation when the hash table grows large. Two-level aggregation splits the hash table into 256 buckets, primarily improving parallelism during the merge phase. It also enables more efficient spill-to-disk when external aggregation is active. Tune the threshold:

```sql
SET group_by_two_level_threshold = 100000;          -- Key count threshold
SET group_by_two_level_threshold_bytes = 50000000;  -- Byte threshold
```

## Sorted Aggregation for Pre-Sorted Keys

When data is sorted by the GROUP BY key, use `optimize_aggregation_in_order`:

```sql
SET optimize_aggregation_in_order = 1;

SELECT user_id, sum(value)
FROM events
GROUP BY user_id
ORDER BY user_id;
```

This streams through groups without building a full hash table, significantly reducing memory usage compared to standard aggregation.

## Approximate Aggregation for High-Cardinality Keys

For reporting where exact counts are not required:

```sql
-- Approximate distinct count (uses far less memory than exact counting)
SELECT uniq(user_id) AS approx_users FROM events;

-- Exact distinct count (uses more memory, as it stores all unique values)
SELECT uniqExact(user_id) AS exact_users FROM events;

-- Approximate quantiles (memory-efficient t-digest algorithm)
SELECT quantileTDigest(0.99)(latency_ms) AS p99 FROM requests;
```

## Filtering Before Aggregation

Push filters as early as possible to reduce the aggregation input size:

```sql
-- Less efficient
SELECT user_id, count()
FROM events
GROUP BY user_id
HAVING count() > 10;

-- More efficient when project_id has good selectivity
SELECT user_id, count()
FROM events
WHERE project_id = 42
GROUP BY user_id
HAVING count() > 10;
```

## Use AggregatingMergeTree for Pre-Aggregation

Reduce aggregation work at query time with pre-aggregated materialized views:

```sql
CREATE MATERIALIZED VIEW mv_user_daily_counts
ENGINE = AggregatingMergeTree()
ORDER BY (user_id, date)
AS
SELECT
    user_id,
    toDate(ts) AS date,
    countState() AS event_count
FROM events
GROUP BY user_id, date;

-- Query the pre-aggregated view
SELECT user_id, date, countMerge(event_count)
FROM mv_user_daily_counts
GROUP BY user_id, date;
```

## Summary

Reducing memory in ClickHouse aggregations involves spill-to-disk settings, sorted aggregation, approximate functions, and pre-aggregation via materialized views. Combine these strategies based on your accuracy requirements and hardware constraints.
