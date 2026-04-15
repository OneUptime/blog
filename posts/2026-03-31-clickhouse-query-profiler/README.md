# How to Configure ClickHouse Query Profiler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Profiler, Performance, Trace Log, Flamegraph, Debugging

Description: Enable and use the ClickHouse query profiler to capture stack traces, identify CPU hotspots, and generate flamegraphs for slow query optimization.

---

## What Is the ClickHouse Query Profiler?

ClickHouse includes a sampling profiler that captures stack traces at configurable intervals during query execution. Traces are stored in `system.trace_log` and can be aggregated into flamegraphs to identify exactly which functions consume the most CPU time.

## Enabling the Profiler

Configure in `users.xml` inside a settings profile:

```xml
<profiles>
    <default>
        <query_profiler_real_time_period_ns>1000000000</query_profiler_real_time_period_ns>
        <query_profiler_cpu_time_period_ns>1000000000</query_profiler_cpu_time_period_ns>
    </default>
</profiles>
```

Or enable per query:

```sql
SET query_profiler_real_time_period_ns = 100000000;   -- sample every 100ms (wall clock)
SET query_profiler_cpu_time_period_ns  = 100000000;   -- sample every 100ms (CPU time)
```

Reduce the period for finer-grained profiling of short queries:

```sql
SET query_profiler_cpu_time_period_ns = 10000000;   -- 10ms
```

## Running a Profiled Query

```sql
SELECT
    user_id,
    count() AS events,
    sum(revenue) AS total
FROM orders
WHERE order_date >= '2026-01-01'
GROUP BY user_id
SETTINGS query_profiler_cpu_time_period_ns = 10000000;
```

## Reading Trace Data

Find the query ID, then read its traces:

```sql
SELECT query_id, query FROM system.query_log
WHERE query LIKE '%orders%' AND event_date = today()
ORDER BY event_time DESC LIMIT 5;
```

Read stack traces for that query:

```sql
SELECT
    trace_type,
    count() AS samples,
    arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), trace), '\n') AS stack
FROM system.trace_log
WHERE query_id = 'YOUR-QUERY-ID'
GROUP BY trace_type, trace
ORDER BY samples DESC
LIMIT 20;
```

## Generating a Flamegraph

Export traces in flamegraph format using ClickHouse's built-in support:

```sql
SELECT
    arrayStringConcat(
        arrayReverse(
            arrayMap(x -> demangle(addressToSymbol(x)), trace)
        ), ';'
    ) AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'YOUR-QUERY-ID'
  AND trace_type = 'CPU'
GROUP BY stack
ORDER BY samples DESC
INTO OUTFILE '/tmp/traces.txt' FORMAT TabSeparated;
```

Then render with FlameGraph:

```bash
cat /tmp/traces.txt | flamegraph.pl > profile.svg
```

## Interpreting Results

Look for wide bars in the flamegraph that indicate functions consuming most CPU:
- `DB::MergeTreeBaseSelectProcessor` - data reading phase
- `DB::Aggregator` - aggregation phase
- `DB::ExpressionActions` - expression evaluation

These point to which part of your query needs optimization.

## Summary

The ClickHouse query profiler captures CPU stack traces at configurable intervals, writing them to `system.trace_log`. Enable it per query or globally, read traces with `demangle` and `addressToSymbol`, and render flamegraphs to identify CPU hotspots in slow queries.
