# How to Use system.trace_log for Performance Profiling in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Profiling, System Table, Trace Log, Debugging

Description: Learn how to use system.trace_log in ClickHouse for CPU profiling, memory sampling, and identifying hot code paths in slow queries.

---

## What Is system.trace_log

`system.trace_log` stores stack trace samples collected by ClickHouse's query profiler. The profiler periodically interrupts running queries and records the current call stack, allowing you to identify which code paths are consuming the most CPU or allocating the most memory.

## Enabling the Query Profiler

Enable trace sampling globally in `users.xml`:

```xml
<profiles>
  <default>
    <query_profiler_real_time_period_ns>1000000000</query_profiler_real_time_period_ns>
    <query_profiler_cpu_time_period_ns>1000000000</query_profiler_cpu_time_period_ns>
  </default>
</profiles>
```

Or set it per query:

```sql
SELECT count() FROM events
SETTINGS
    query_profiler_real_time_period_ns = 100000000,
    query_profiler_cpu_time_period_ns = 100000000;
```

## Schema of system.trace_log

```sql
DESCRIBE system.trace_log;
```

Key columns:

- `event_time` - when the sample was taken
- `query_id` - the query being profiled
- `thread_id` - OS thread ID
- `trace_type` - `Real`, `CPU`, `Memory`, `MemorySample`, `MemoryPeak`, `ProfileEvent`
- `trace` - array of memory addresses representing the call stack
- `size` - memory size (for memory trace types)

## Viewing Raw Trace Samples

```sql
SELECT
    event_time,
    query_id,
    trace_type,
    length(trace) AS stack_depth
FROM system.trace_log
WHERE event_date = today()
  AND query_id != ''
ORDER BY event_time DESC
LIMIT 20;
```

## Profiling a Specific Query

Run your query, then look up its trace:

```sql
-- Step 1: Run the query with profiling
SET query_profiler_cpu_time_period_ns = 100000000;
SELECT
    toStartOfHour(ts) AS hour,
    count() AS events
FROM large_events_table
WHERE ts >= now() - INTERVAL 30 DAY
GROUP BY hour
ORDER BY hour;

-- Step 2: Get query ID
SELECT query_id, query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 5;

-- Step 3: View trace
SELECT
    trace_type,
    count() AS samples,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace), '\n'
    ) AS stack
FROM system.trace_log
WHERE query_id = 'your-query-id'
GROUP BY trace_type, trace
ORDER BY samples DESC
LIMIT 20;
```

## Aggregating Hot Functions

```sql
-- Find the most sampled functions for a query
SELECT
    arrayJoin(trace) AS addr,
    demangle(addressToSymbol(addr)) AS func,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY addr, func
ORDER BY samples DESC
LIMIT 20;
```

## Memory Profiling

```sql
-- Find the top memory-allocating code paths
SELECT
    trace_type,
    sum(size) AS total_allocated_bytes,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'Memory'
GROUP BY trace_type
ORDER BY total_allocated_bytes DESC;
```

## Comparing CPU vs Real Time

```sql
SELECT
    trace_type,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
GROUP BY trace_type;
```

If `Real` samples are much higher than `CPU` samples, the query is spending time waiting on I/O or synchronization rather than computing.

## Enabling trace_log Retention

```xml
<trace_log>
    <database>system</database>
    <table>trace_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    <ttl>event_date + INTERVAL 7 DAY</ttl>
</trace_log>
```

## Using flamegraph-tools for Visualization

Export traces for use with flamegraph tools:

```bash
clickhouse-client --query "
SELECT
    arrayStringConcat(
        arrayReverse(arrayMap(x -> demangle(addressToSymbol(x)), trace)), ';'
    ) AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY stack
" --format TabSeparated > /tmp/trace.txt

# Convert to flamegraph
flamegraph.pl /tmp/trace.txt > /tmp/flamegraph.svg
```

## Summary

`system.trace_log` enables low-level CPU and memory profiling of ClickHouse queries by recording periodic call stack samples. Enable the query profiler with `query_profiler_cpu_time_period_ns`, run your slow queries, then analyze hot code paths using `demangle(addressToSymbol())` and aggregate by function address. This is particularly useful for understanding whether bottlenecks are in computation, I/O, or memory allocation.
