# How ClickHouse Memory Allocator Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory Allocator, Jemalloc, Memory Limit, Performance

Description: Explains how ClickHouse uses jemalloc for memory allocation, how query memory limits are enforced, and how to diagnose and reduce memory usage in production.

---

## ClickHouse Uses jemalloc

ClickHouse uses jemalloc as its memory allocator by default (replacing glibc malloc). jemalloc provides:
- Better multi-threaded allocation performance (thread-local arenas)
- Better memory fragmentation characteristics under concurrent workloads
- Built-in profiling for heap allocation debugging

```bash
# Verify jemalloc is in use
clickhouse-client --query "SELECT * FROM system.settings WHERE name = 'memory_profiler_sample_probability'"
```

## Memory Tracking at Query Level

ClickHouse tracks memory allocation per query using a `MemoryTracker`. When a query exceeds its limit, ClickHouse throws an exception instead of swapping to disk (by default).

```sql
-- Set per-query memory limit (bytes)
SET max_memory_usage = 10000000000;  -- 10GB per query

-- Set server-wide query memory limit
-- In users.xml or via settings profile:
-- <max_memory_usage>10000000000</max_memory_usage>
```

## Common Memory Consumers

```sql
-- See current memory usage by running query
SELECT
  query_id,
  formatReadableSize(memory_usage) AS memory,
  query
FROM system.processes
ORDER BY memory_usage DESC;

-- Historical peak memory per query
SELECT
  query_id,
  formatReadableSize(memory_usage) AS peak_memory,
  query_duration_ms,
  substr(query, 1, 100) AS query_preview
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY memory_usage DESC
LIMIT 20;
```

## Memory Arenas by Component

ClickHouse allocates memory in different arenas for different purposes:

```text
Component             | Memory Use
----------------------|----------------------------------------------------
Hash join right table | Full right-side table loaded for hash join
GROUP BY hash table   | Partial aggregation state per thread
Sorting buffer        | Sort buffer for ORDER BY operations
Read buffer           | Column data decompression buffers
Dictionary            | Full dictionary contents in RAM
Mark cache            | Mark file cache (default 5GB)
Uncompressed cache    | Decompressed block cache (default 8GB, use_uncompressed_cache off)
```

## Diagnosing Memory Issues

```sql
-- Total memory used by ClickHouse process
SELECT formatReadableSize(value) AS memory
FROM system.asynchronous_metrics
WHERE metric = 'MemoryResident';

-- Memory used by dictionaries
SELECT name, formatReadableSize(bytes_allocated) AS memory
FROM system.dictionaries
ORDER BY bytes_allocated DESC;

-- Memory used by caches
SELECT * FROM system.caches;
```

## Reducing Memory Usage for Aggregations

```sql
-- Allow aggregation to spill to disk instead of OOM
SET max_bytes_before_external_group_by = 10000000000;  -- 10GB threshold

-- Allow sorts to spill
SET max_bytes_before_external_sort = 10000000000;

-- Reduce threads to reduce parallel hash table memory
SET max_threads = 4;
```

## jemalloc Heap Profiling

```sql
-- Enable heap profiling (writes heap profile to /tmp)
SYSTEM JEMALLOC ENABLE PROFILE;
-- Run queries...
SYSTEM JEMALLOC FLUSH PROFILE;
SYSTEM JEMALLOC DISABLE PROFILE;
```

Analyze the profile with `jeprof` to identify allocation hotspots.

## Summary

ClickHouse tracks memory per-query via MemoryTracker and enforces limits by throwing exceptions. The largest memory consumers are typically hash joins, GROUP BY hash tables, and loaded dictionaries. Enable external GROUP BY and sort spilling with `max_bytes_before_external_group_by` to avoid OOM errors on large aggregations. Monitor memory usage via `system.processes` for live queries and `system.query_log` for historical peak memory.
