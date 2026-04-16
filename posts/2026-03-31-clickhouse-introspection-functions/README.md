# How to Use ClickHouse Introspection Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Introspection, Performance, Profiling, System Table, Debug

Description: Learn how to use ClickHouse introspection functions including addressToSymbol, demangle, and flamegraph to profile query CPU hotspots and diagnose performance issues.

---

ClickHouse provides a set of low-level introspection functions that let you inspect the server's internal state, symbolize stack traces from the sampling profiler, and build flame graphs for CPU-bound queries. These functions are invaluable for diagnosing performance problems that system tables alone cannot explain.

## Prerequisites

Introspection functions require elevated permissions. Enable them for your monitoring user:

```sql
GRANT INTROSPECTION ON *.* TO monitoring_user;
```

Set the sampling profiler period for the session:

```sql
-- Sample every 100ms of real time
SET query_profiler_real_time_period_ns = 100000000;

-- Sample every 100ms of CPU time
SET query_profiler_cpu_time_period_ns = 100000000;
```

## addressToSymbol and demangle

These two functions convert raw memory addresses from profiler samples into human-readable function names.

```sql
-- Raw address from trace_log
SELECT arrayJoin(trace) AS address
FROM system.trace_log
WHERE query_id = 'your-query-id'
LIMIT 5;

-- Convert addresses to symbol names
SELECT
    arrayJoin(trace) AS address,
    addressToSymbol(address) AS mangled_name,
    demangle(addressToSymbol(address)) AS function_name
FROM system.trace_log
WHERE query_id = 'your-query-id'
LIMIT 10;
```

## Building a Flame Graph from trace_log

The `trace_log` table stores stack traces sampled during query execution. Aggregate them to find the hottest code paths:

```sql
-- Find the top CPU-consuming functions for a specific query
SELECT
    demangle(addressToSymbol(arrayJoin(trace))) AS function_name,
    count() AS sample_count
FROM system.trace_log
WHERE
    query_id = 'your-slow-query-id'
    AND trace_type = 'CPU'
GROUP BY function_name
ORDER BY sample_count DESC
LIMIT 30;
```

Generate a folded stack trace suitable for the `flamegraph.pl` tool:

```bash
clickhouse-client --format TabSeparated --query "
SELECT
    arrayStringConcat(
        arrayReverse(
            arrayMap(x -> demangle(addressToSymbol(x)), trace)
        ),
        ';'
    ) AS folded_stack,
    count() AS weight
FROM system.trace_log
WHERE
    event_date >= today()
    AND trace_type = 'CPU'
GROUP BY folded_stack
ORDER BY weight DESC
" > /tmp/clickhouse-stacks.txt

# Generate flame graph (requires flamegraph.pl from Brendan Gregg's toolkit)
perl flamegraph.pl /tmp/clickhouse-stacks.txt > /tmp/clickhouse-flamegraph.svg
```

## Profiling a Specific Query

Run a query with profiling enabled and then inspect the resulting trace:

```sql
-- Step 1: Run the query with profiling
SET query_profiler_real_time_period_ns = 50000000;  -- 50ms sampling
SET query_profiler_cpu_time_period_ns  = 50000000;

-- Run the query you want to profile
SELECT
    toStartOfHour(event_time) AS hour,
    user_id,
    count() AS events,
    uniqExact(session_id) AS sessions
FROM events
WHERE event_date >= today() - 30
GROUP BY hour, user_id
ORDER BY events DESC
LIMIT 100;
```

```sql
-- Step 2: Find the query_id from query_log
SELECT query_id, query_duration_ms
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 5 MINUTE
    AND is_initial_query = 1
    AND query LIKE '%uniqExact%'
ORDER BY event_time DESC
LIMIT 5;
```

```sql
-- Step 3: Analyze the trace for that query_id
SELECT
    demangle(addressToSymbol(arrayJoin(trace))) AS function_name,
    count() AS samples,
    round(count() * 100.0 / (SELECT count() FROM system.trace_log WHERE query_id = 'QID'), 1) AS pct
FROM system.trace_log
WHERE
    query_id = 'QID'
    AND trace_type IN ('CPU', 'Real')
GROUP BY function_name
ORDER BY samples DESC
LIMIT 20;
```

## Using addressToLine

Convert addresses to source file and line numbers for deeper analysis:

```sql
-- Get source file and line number for stack frames
SELECT
    address,
    addressToLine(address) AS source_location,
    demangle(addressToSymbol(address)) AS function_name
FROM (
    SELECT arrayJoin(trace) AS address
    FROM system.trace_log
    WHERE
        query_id = 'your-query-id'
        AND trace_type = 'CPU'
    LIMIT 100
)
ORDER BY address;
```

## Inspecting Server Threads

Use `system.stack_trace` to get the current call stack of all server threads:

```sql
-- Snapshot of all thread stacks right now
SELECT
    thread_id,
    thread_name,
    query_id,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        '\n'
    ) AS stack
FROM system.stack_trace
ORDER BY thread_name
LIMIT 20;
```

Find threads stuck in slow IO or lock waits:

```sql
SELECT
    thread_name,
    query_id,
    arrayFilter(x -> position(demangle(addressToSymbol(x)), 'sleep') > 0
                   OR position(demangle(addressToSymbol(x)), 'wait') > 0,
                trace) AS blocking_frames
FROM system.stack_trace
WHERE length(blocking_frames) > 0;
```

## Capturing the Current Thread Stack

To capture the stack of the currently executing thread, join `system.stack_trace` against the thread id returned by the `tid()` introspection function:

```sql
-- Capture a stack trace at query execution time
SELECT
    arrayMap(x -> demangle(addressToSymbol(x)), trace) AS current_stack
FROM system.stack_trace
WHERE thread_id = tid();
```

## Analyzing Memory Allocations

Profile memory allocation patterns:

```sql
-- Top allocating functions for a query
SELECT
    demangle(addressToSymbol(arrayJoin(trace))) AS function_name,
    count() AS alloc_samples
FROM system.trace_log
WHERE
    trace_type = 'MemorySample'
    AND query_id = 'your-query-id'
GROUP BY function_name
ORDER BY alloc_samples DESC
LIMIT 20;
```

## Using Allocator Introspection

ClickHouse uses jemalloc by default. Check allocator stats:

```sql
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric LIKE '%jemalloc%'
ORDER BY metric;
```

## Enabling trace_log Retention

Ensure trace data is retained long enough to be useful:

```bash
sudo tee /etc/clickhouse-server/config.d/trace-log.xml > /dev/null <<'EOF'
<clickhouse>
    <trace_log>
        <database>system</database>
        <table>trace_log</table>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
        <engine>
            ENGINE = MergeTree
            PARTITION BY toYYYYMM(event_date)
            ORDER BY (event_date, event_time)
            TTL event_date + INTERVAL 7 DAY
        </engine>
    </trace_log>
</clickhouse>
EOF
```

## Summary

ClickHouse introspection functions provide production-grade profiling without requiring external profilers. Use `addressToSymbol` and `demangle` to convert raw addresses from `system.trace_log` into human-readable function names. Aggregate these into folded stack format to generate flame graphs with `flamegraph.pl`. Use `system.stack_trace` for a live snapshot of all thread stacks. Combine CPU profiling, memory allocation sampling, and real-time stack inspection to pinpoint the exact code path causing a performance bottleneck.
