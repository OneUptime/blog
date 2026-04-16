# How to Fix 'Memory limit exceeded for query' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Query Optimization, Troubleshooting, Performance

Description: Resolve ClickHouse 'Memory limit exceeded for query' errors by tuning memory limits, optimizing query plans, and using external aggregation for large datasets.

---

## Understanding the Error

ClickHouse raises this error when a query's memory consumption exceeds the configured limit:

```text
DB::Exception: Memory limit (for query) exceeded: would use 10.50 GiB (attempt to allocate chunk of 1073741824 bytes), maximum: 9.31 GiB. (MEMORY_LIMIT_EXCEEDED)
```

The limit is controlled by `max_memory_usage` per query and `max_memory_usage_for_user` per user.

## Diagnosing Memory Usage

### Find Memory-Hungry Queries

```sql
-- Check active queries and their memory usage
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage) AS mem_used,
    formatReadableSize(peak_memory_usage) AS peak_mem,
    query
FROM system.processes
ORDER BY memory_usage DESC;
```

### Review Historical Memory Usage

```sql
-- Queries that used the most memory in the last 24h
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS mem_used,
    query_duration_ms,
    left(query, 200) AS query_preview
FROM system.query_log
WHERE event_time > now() - INTERVAL 24 HOUR
  AND type = 'QueryFinish'
ORDER BY memory_usage DESC
LIMIT 10;
```

## Increasing Memory Limits

### Session-Level Increase

```sql
-- Allow up to 20 GB for this session
SET max_memory_usage = 20000000000;

-- Now run the heavy query
SELECT user_id, count(), sum(revenue)
FROM analytics.transactions
GROUP BY user_id;
```

### Profile-Level Increase

In `users.xml`:

```xml
<profiles>
  <analysts>
    <!-- 20 GB per query -->
    <max_memory_usage>20000000000</max_memory_usage>
    <!-- 50 GB for all queries from this user -->
    <max_memory_usage_for_user>50000000000</max_memory_usage_for_user>
  </analysts>
</profiles>
```

## Reducing Memory Usage Through Query Optimization

### Use GROUP BY with External Aggregation

```sql
-- Spill aggregation state to disk when memory is limited
SET group_by_use_nulls = 0;
SET max_bytes_before_external_group_by = 10000000000; -- 10 GB threshold

SELECT country, count(), sum(revenue)
FROM analytics.sales
GROUP BY country;
```

### Filter Early

```sql
-- Bad: scans all data then filters in aggregation
SELECT user_id, sum(amount)
FROM transactions
GROUP BY user_id
HAVING sum(amount) > 1000;

-- Better: filter before aggregating
SELECT user_id, sum(amount)
FROM transactions
WHERE event_date >= '2024-01-01'
GROUP BY user_id
HAVING sum(amount) > 1000;
```

### Use SAMPLE for Approximate Results

```sql
-- Use 10% sample to drastically reduce memory
SELECT
    user_id,
    count() * 10 AS approx_events
FROM analytics.events SAMPLE 0.1
GROUP BY user_id
ORDER BY approx_events DESC
LIMIT 100;
```

### Reduce JOIN Memory with Hash Join Tuning

```sql
-- For large JOINs, use partial merge join which uses less memory
SET join_algorithm = 'partial_merge';
SET max_bytes_in_join = 5000000000; -- 5 GB cap

SELECT e.user_id, e.event_type, u.plan_type
FROM analytics.events AS e
JOIN analytics.users AS u ON e.user_id = u.user_id;
```

## Memory Profiling

```sql
-- Enable memory profiling to trace allocations
SET memory_profiler_step = 4194304; -- profile every 4MB
SET memory_profiler_sample_probability = 0.01;

-- After the query, view the trace
SELECT
    trace_type,
    formatReadableSize(sum(size)) AS allocated
FROM system.trace_log
WHERE query_id = 'your-query-id'
GROUP BY trace_type;
```

## Summary

ClickHouse memory limit errors occur when queries try to build large intermediate structures (GROUP BY states, JOINs, sorts) in memory. Fix them by increasing `max_memory_usage` at the session or profile level, enabling external aggregation with `max_bytes_before_external_group_by`, filtering data earlier in the pipeline, and using SAMPLE for approximate analytics. Profile memory-heavy queries with `system.trace_log` to find the specific operation consuming the most memory.
