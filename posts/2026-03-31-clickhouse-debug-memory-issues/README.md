# How to Debug Memory-Related Issues in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Debugging, Performance, Troubleshooting

Description: Learn how to debug memory-related issues in ClickHouse including memory limit exceeded errors, OOM kills, and high memory queries.

---

## Common Memory Issues

- `MEMORY_LIMIT_EXCEEDED` errors on complex queries
- OOM (out of memory) kills causing server crashes
- Unexpectedly high memory usage from background tasks
- Memory not being released after queries complete

## Understanding ClickHouse Memory Limits

ClickHouse has multiple memory limit settings:

```sql
-- Per-query limit in bytes (0 = unlimited; default is 10 GB)
SET max_memory_usage = 10737418240;  -- 10 GB

-- Total memory limit in bytes for all concurrent queries from a user (0 = unlimited)
SET max_memory_usage_for_user = 21474836480;  -- 20 GB for user total

-- Server-wide hard limit
-- Set in config.xml: <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
```

## Identifying Memory-Hungry Queries

```sql
SELECT
    query_id,
    memory_usage,
    peak_memory_usage,
    read_rows,
    query_duration_ms,
    query
FROM system.query_log
WHERE event_date = today()
  AND peak_memory_usage > 1073741824  -- over 1 GB
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

## Real-Time Memory Monitoring

```sql
SELECT
    query_id,
    user,
    memory_usage,
    elapsed,
    query
FROM system.processes
ORDER BY memory_usage DESC
LIMIT 10;
```

## Checking Overall Server Memory

```sql
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE '%Memory%'
ORDER BY metric;
```

Key metrics:

```text
MemoryTracking              - Total tracked memory allocated by the server
MergesMutationsMemoryTracking - Memory used by background merges and mutations
MemoryTrackingUncorrected   - Tracked memory not corrected by RSS
```

## Memory Debugging with system.trace_log

Enable memory sampling to find allocation sites:

```sql
SET memory_profiler_sample_probability = 0.01;  -- 1% sample rate

-- Run your query, then inspect allocations
SELECT
    demangle(addressToSymbol(arrayFirst(x -> x != 0, trace))) AS allocator,
    sum(size) AS total_allocated
FROM system.trace_log
WHERE trace_type = 'MemorySample'
  AND size > 0
  AND query_id = 'your-query-id'
GROUP BY allocator
ORDER BY total_allocated DESC
LIMIT 10;
```

## Reducing Memory Usage

### Use LIMIT to Reduce Result Size

```sql
SELECT * FROM events ORDER BY created_at DESC LIMIT 1000;
-- instead of
SELECT * FROM events ORDER BY created_at DESC;
```

### Prefer GROUP BY over DISTINCT

```sql
-- Lower memory: GROUP BY
SELECT user_id FROM events GROUP BY user_id;
-- Higher memory: DISTINCT (may buffer all data)
SELECT DISTINCT user_id FROM events;
```

### Set max_bytes_before_external_group_by

Spill GROUP BY to disk when memory is tight:

```sql
SET max_bytes_before_external_group_by = 10737418240;  -- 10 GB threshold
SET max_bytes_before_external_sort = 10737418240;
```

## Investigating Memory Leaks

If memory keeps growing after queries complete:

```sql
-- Check for queries still running
SELECT * FROM system.processes;

-- Check for cached data
SELECT * FROM system.caches;

-- Drop uncompressed block cache if needed
SYSTEM DROP UNCOMPRESSED CACHE;
SYSTEM DROP MARK CACHE;
```

## Summary

Debug ClickHouse memory issues by monitoring `system.query_log` for peak memory, using `system.processes` for real-time tracking, and enabling memory profiling in `system.trace_log`. Reduce memory usage by adding LIMITs, enabling external GROUP BY spilling, and tuning per-query and server-level limits. For persistent high memory, investigate background merge tasks and cache sizes.
