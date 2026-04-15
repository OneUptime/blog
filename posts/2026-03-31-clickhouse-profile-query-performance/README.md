# How to Profile Query Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Profiling, Query Optimization, system.query_log, Tracing

Description: Learn how to profile slow queries in ClickHouse using query logs, query trace logs, and built-in sampling profiler tools to identify bottlenecks.

---

Profiling query performance in ClickHouse involves multiple layers: query-level statistics in `system.query_log`, per-thread profiling in `system.query_thread_log`, and stack-level profiling via the sampling profiler. Together these tools pinpoint exactly where queries spend their time.

## Using system.query_log

The first stop for any slow query investigation:

```sql
SELECT
    query_id,
    event_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 1000
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

Look at the key metrics:

```sql
SELECT
    query_id,
    query_duration_ms,
    read_rows,
    read_bytes,
    result_rows,
    memory_usage,
    ProfileEvents['RealTimeMicroseconds'] AS real_time_us,
    ProfileEvents['UserTimeMicroseconds'] AS user_cpu_us,
    ProfileEvents['SystemTimeMicroseconds'] AS sys_cpu_us,
    ProfileEvents['DiskReadElapsedMicroseconds'] AS disk_read_us
FROM system.query_log
WHERE query_id = 'your-query-id-here';
```

## Enabling Query Thread Profiling

For per-thread breakdown, enable `system.query_thread_log`:

```text
<query_thread_log>
  <database>system</database>
  <table>query_thread_log</table>
  <flush_interval_milliseconds>7500</flush_interval_milliseconds>
</query_thread_log>
```

Query thread-level breakdown:

```sql
SELECT
    query_id,
    thread_name,
    thread_id,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_thread_log
WHERE query_id = 'your-query-id-here'
ORDER BY read_rows DESC;
```

## Using SEND_PROGRESS_IN_HTTP_HEADERS

For real-time monitoring during long queries, enable progress tracking:

```sql
SET send_progress_in_http_headers = 1;
SET http_headers_progress_interval_ms = 100;
```

## Enabling the Sampling Profiler

ClickHouse includes a CPU sampling profiler that captures stack traces:

```sql
SET query_profiler_real_time_period_ns = 1000000;  -- sample every 1ms
SET query_profiler_cpu_time_period_ns = 1000000;

-- Run your query
SELECT count() FROM large_table WHERE complex_condition = true;
```

Read profiler results:

```sql
SELECT
    arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), trace), '\n') AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id-here'
  AND trace_type = 'CPU'
GROUP BY trace
ORDER BY samples DESC
LIMIT 10;
```

## Analyzing Processor-Level Performance

Use EXPLAIN PIPELINE to understand query execution at the operator level:

```sql
EXPLAIN PIPELINE
SELECT count(), category
FROM events
WHERE event_date >= today() - 7
GROUP BY category;
```

## Measuring Part Scans

Check how many data parts are scanned:

```sql
SELECT
    ProfileEvents['SelectedParts'] AS parts_scanned,
    ProfileEvents['SelectedRanges'] AS ranges_scanned,
    ProfileEvents['SelectedMarks'] AS marks_scanned,
    read_rows,
    query_duration_ms
FROM system.query_log
WHERE query_id = 'your-query-id-here';
```

If `marks_scanned` is very high relative to `read_rows`, your primary key or skip indexes need optimization.

## Using clickhouse-benchmark

Benchmark queries under load:

```bash
clickhouse-benchmark \
  --concurrency 10 \
  --iterations 100 \
  --query "SELECT count() FROM events WHERE event_date = today()"
```

## Summary

Query profiling in ClickHouse starts with `system.query_log` for high-level stats, drills into `system.query_thread_log` for thread-level breakdown, and uses the sampling profiler for CPU hotspot analysis. Focus on `marks_scanned`, memory usage, and CPU time as the primary indicators of optimization opportunities.
