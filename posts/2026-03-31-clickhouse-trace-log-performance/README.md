# How to Use system.trace_log for Performance Analysis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.trace_log, Performance, Profiling, Debugging

Description: Learn how to use system.trace_log in ClickHouse to analyze CPU hotspots, memory allocation patterns, and execution bottlenecks in slow queries.

---

## What Is system.trace_log?

`system.trace_log` stores sampled stack traces collected by ClickHouse's built-in query profiler. Each row represents a profiler sample captured at a point in time, along with the call stack at that moment. Analyzing these samples shows where time is being spent.

## Enabling Trace Collection

```sql
SET query_profiler_real_time_period_ns = 10000000;  -- 10ms wall clock sampling
SET query_profiler_cpu_time_period_ns  = 10000000;  -- 10ms CPU sampling
```

Run your query, then query `system.trace_log`.

To resolve stack trace addresses to human-readable function names, enable introspection functions (disabled by default):

```sql
SET allow_introspection_functions = 1;
```

## Schema Overview

```sql
DESCRIBE system.trace_log;
```

Key columns:

```text
event_date      - Date of the sample
event_time      - Timestamp of the sample
query_id        - Associated query ID
trace_type      - CPU, Real, Memory, or MemorySample
trace           - Array of instruction addresses (the call stack)
size            - For memory traces, bytes allocated/freed
```

## Finding CPU Hotspots

```sql
SELECT
    arrayFirst(x -> x != 0, trace) AS top_frame_addr,
    demangle(addressToSymbol(top_frame_addr)) AS function_name,
    count() AS sample_count
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY top_frame_addr
ORDER BY sample_count DESC
LIMIT 15;
```

Functions with the highest sample counts are your CPU hotspots.

## Analyzing Real-Time (Wall Clock) Samples

CPU samples miss time spent waiting for I/O or locks. Use `Real` type:

```sql
SELECT
    demangle(addressToSymbol(arrayFirst(x -> x != 0, trace))) AS function_name,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'Real'
GROUP BY function_name
ORDER BY samples DESC
LIMIT 10;
```

## Memory Allocation Analysis

```sql
SELECT
    demangle(addressToSymbol(arrayFirst(x -> x != 0, trace))) AS function_name,
    sum(size) AS total_bytes_allocated
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'MemorySample'
  AND size > 0
GROUP BY function_name
ORDER BY total_bytes_allocated DESC
LIMIT 10;
```

## Full Stack Trace for Inspection

```sql
SELECT
    count() AS samples,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        ' -> '
    ) AS call_chain
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY trace
ORDER BY samples DESC
LIMIT 5;
```

## Comparing Two Queries

```sql
SELECT
    demangle(addressToSymbol(arrayFirst(x -> x != 0, trace))) AS fn,
    countIf(query_id = 'query-a') AS samples_a,
    countIf(query_id = 'query-b') AS samples_b
FROM system.trace_log
WHERE query_id IN ('query-a', 'query-b')
  AND trace_type = 'CPU'
GROUP BY fn
ORDER BY samples_a + samples_b DESC
LIMIT 20;
```

This lets you see where the two queries diverge in CPU usage.

## Cleanup

`system.trace_log` can grow large during heavy profiling. Flush or truncate it:

```sql
SYSTEM FLUSH LOGS;
TRUNCATE TABLE system.trace_log;
```

## Summary

`system.trace_log` provides sampled CPU, wall-clock, and memory traces for ClickHouse queries. Use `trace_type = 'CPU'` to find compute hotspots, `Real` to find I/O waits, and `MemorySample` to find allocation sites. Combine with `demangle(addressToSymbol(...))` to convert raw addresses to readable function names.
