# How to Diagnose ClickHouse Query Memory Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Diagnosis, Performance, Query Log, OOM

Description: Diagnose ClickHouse query memory spikes using system tables, memory profiler traces, and query settings to identify and fix excessive memory consumption.

---

## Symptoms of Memory Spikes

- `Memory limit exceeded` errors
- Server crashes with OOM kills
- Sudden RAM spike visible in monitoring during specific queries
- Slow queries that work fine on small datasets but fail on full data

## Step 1 - Check Query Memory Usage

Look at recent high-memory queries:

```sql
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS mem,
    query_duration_ms AS ms,
    query
FROM system.query_log
WHERE event_date = today()
  AND type = 'QueryFinish'
ORDER BY memory_usage DESC
LIMIT 20;
```

## Step 2 - Check Currently Running Queries

For in-flight spikes:

```sql
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage) AS mem,
    query
FROM system.processes
ORDER BY memory_usage DESC;
```

## Step 3 - Identify Memory Allocation Sources

Enable memory sampling traces:

```sql
SET memory_profiler_sample_probability = 0.01;
SET memory_profiler_step = 4194304;  -- trace every 4 MB allocation
```

Then run the suspect query and check traces:

```sql
SELECT
    sum(size) AS total_bytes,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        '\n'
    ) AS stack
FROM system.trace_log
WHERE trace_type = 'MemorySample'
  AND query_id = 'suspect-query-id'
GROUP BY trace
ORDER BY total_bytes DESC
LIMIT 10;
```

## Common Memory Spike Causes

1. **GROUP BY without pre-filtering** - aggregating billions of rows builds large hash tables:

```sql
-- Bad: aggregates everything first
SELECT user_id, count() FROM events GROUP BY user_id;

-- Better: filter first
SELECT user_id, count() FROM events
WHERE ts >= today() - 7 GROUP BY user_id;
```

2. **Non-key JOINs** - right table is loaded entirely into memory:

```sql
-- Force smaller side to be right table
SELECT l.*, r.name FROM large_table l JOIN small_table r ON l.id = r.id;
```

3. **Wide result sets** - `SELECT *` on wide tables with many columns.

4. **Subqueries without early filtering**.

## Enabling External GROUP BY

Allow GROUP BY to spill to disk when memory is exceeded:

```sql
SET max_bytes_before_external_group_by = 10000000000;  -- 10 GB
SET max_memory_usage = 20000000000;
```

## Setting Memory Limits

Add hard limits to prevent OOM:

```sql
SET max_memory_usage = 8000000000;          -- 8 GB per query
SET max_memory_usage_for_user = 16000000000; -- 16 GB per user
```

## Summary

Diagnose ClickHouse query memory spikes by checking `system.query_log` for `memory_usage` (peak consumption per query), inspecting `system.processes` for live queries, and enabling memory sampling traces to identify allocation hotspots. Fix spikes by filtering before aggregation, placing the smaller table on the right side of joins, and enabling external GROUP BY for queries that legitimately need large hash tables.
