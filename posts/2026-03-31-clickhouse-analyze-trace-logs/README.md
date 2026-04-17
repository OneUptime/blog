# How to Analyze ClickHouse Trace Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Trace Log, Debugging, Performance, system.trace_log, Profiler

Description: Analyze ClickHouse trace logs to identify performance bottlenecks, memory hotspots, and slow code paths using system.trace_log queries and flamegraphs.

---

## What Are Trace Logs?

ClickHouse's `system.trace_log` table stores sampling profiler data collected during query execution. Each row represents a stack trace captured at a point in time during a query, tagged with the query ID, thread, and trace type (CPU, Memory, Real, etc.).

## Enabling Trace Collection

Enable trace logging in `config.xml`:

```xml
<trace_log>
    <database>system</database>
    <table>trace_log</table>
    <partition_by>toYYYYMM(event_date)</partition_by>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
</trace_log>
```

Set profiler intervals:

```sql
SET query_profiler_cpu_time_period_ns = 100000000;
SET query_profiler_real_time_period_ns = 100000000;
```

## Exploring Trace Log Schema

```sql
DESCRIBE system.trace_log;
```

Key columns:
- `event_time` - when the trace was captured
- `query_id` - links to `system.query_log`
- `trace_type` - CPU, Real, Memory, MemorySample, MemoryPeak
- `trace` - array of memory addresses (the stack)
- `size` - for memory traces, bytes allocated

## Finding the Slowest Queries

```sql
SELECT
    query_id,
    count() AS samples
FROM system.trace_log
WHERE event_date = today() AND trace_type = 'CPU'
GROUP BY query_id
ORDER BY samples DESC
LIMIT 10;
```

More samples = more CPU time. Match `query_id` to `system.query_log` for context.

## Decoding Stack Traces

```sql
SELECT
    count() AS cnt,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        '\n'
    ) AS stack
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY trace
ORDER BY cnt DESC
LIMIT 10;
```

## Identifying Memory Allocation Hotspots

```sql
SELECT
    sum(size) AS bytes_allocated,
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        '\n'
    ) AS stack
FROM system.trace_log
WHERE trace_type = 'MemorySample'
  AND query_id = 'your-query-id'
GROUP BY trace
ORDER BY bytes_allocated DESC
LIMIT 10;
```

## Aggregating Traces Cluster-Wide

On a cluster, traces are node-local. Use `clusterAllReplicas` to aggregate:

```sql
SELECT count() AS samples, query_id
FROM clusterAllReplicas('my_cluster', system, trace_log)
WHERE event_date = today() AND trace_type = 'CPU'
GROUP BY query_id
ORDER BY samples DESC
LIMIT 10;
```

## Exporting for Flamegraph Rendering

```sql
SELECT
    arrayStringConcat(
        arrayReverse(arrayMap(x -> demangle(addressToSymbol(x)), trace)),
        ';'
    ) AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id' AND trace_type = 'CPU'
GROUP BY trace
INTO OUTFILE '/tmp/flamegraph_input.txt'
FORMAT TabSeparated;
```

```bash
cat /tmp/flamegraph_input.txt | flamegraph.pl > flame.svg
```

## Summary

Analyze ClickHouse trace logs by querying `system.trace_log` to find CPU and memory hotspots per query, decoding stack trace addresses with `demangle` and `addressToSymbol`, and exporting data for flamegraph rendering. Combine with `system.query_log` to correlate profiling samples with query metadata.
