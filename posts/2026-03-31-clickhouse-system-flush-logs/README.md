# How to Use SYSTEM FLUSH LOGS in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, System, Log, Flush

Description: Learn how SYSTEM FLUSH LOGS works in ClickHouse, which system log tables it flushes, and when to use it for accurate observability data.

---

ClickHouse collects detailed operational data - query history, trace events, part merges, errors, and more - in a set of system log tables. For performance reasons, these tables are not written synchronously; entries are buffered in memory and flushed to disk on a schedule. If you need up-to-the-second accurate data from these tables (for example, after running a benchmark or during debugging), you need `SYSTEM FLUSH LOGS` to force an immediate write. This post explains what gets flushed, when to use it, and how to verify the results.

## What SYSTEM FLUSH LOGS Does

```sql
SYSTEM FLUSH LOGS;
```

This single command forces all pending in-memory log entries across all system log tables to be written to their respective MergeTree tables immediately. It is a synchronous operation - it blocks until all flushes complete.

## Which Tables Are Flushed

ClickHouse buffers data for the following system log tables (when enabled in `config.xml`):

| Table | Contents |
|---|---|
| `system.query_log` | Every query executed, with timing and resource usage |
| `system.query_thread_log` | Per-thread breakdown of query execution |
| `system.trace_log` | Stack traces from the query profiler |
| `system.part_log` | MergeTree part lifecycle events (create, merge, drop) |
| `system.metric_log` | Periodic snapshots of server metrics |
| `system.asynchronous_metric_log` | Async metric snapshots |
| `system.text_log` | Server log messages (errors, warnings, info) |
| `system.crash_log` | Crash stack traces |
| `system.opentelemetry_span_log` | OpenTelemetry distributed trace spans |
| `system.processors_profile_log` | Pipeline processor execution details |
| `system.session_log` | Login, logout, and session events |
| `system.zookeeper_log` | ZooKeeper/Keeper request and response log |

Only tables that are enabled in your server configuration will be present and flushed.

## Basic Usage

Run a query, flush logs, then inspect results:

```sql
-- Step 1: run a query you want to analyze
SELECT count() FROM events WHERE created_at >= today();

-- Step 2: flush all log buffers to disk
SYSTEM FLUSH LOGS;

-- Step 3: query the log table
SELECT
    query,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 MINUTE
ORDER BY event_time DESC
LIMIT 5;
```

Without `SYSTEM FLUSH LOGS`, the last few entries may not yet appear in `system.query_log`.

## Flushing a Specific Log Table

If you only need one table flushed, ClickHouse 25.4+ supports targeted flushes:

```sql
SYSTEM FLUSH LOGS query_log;
SYSTEM FLUSH LOGS trace_log;
SYSTEM FLUSH LOGS part_log;
```

This is more efficient than flushing everything when you are monitoring a specific subsystem.

## Checking the Flush Interval

The flush interval is configured per log table in `config.xml`. The default is 7500 milliseconds (7.5 seconds):

```xml
<query_log>
    <database>system</database>
    <table>query_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
</query_log>
```

You can verify the current configuration by inspecting `system.server_settings` or the config file directly. If the flush interval is acceptable for your monitoring needs, you may not need to call `SYSTEM FLUSH LOGS` at all.

## Practical Use Cases

### After a benchmark

```sql
-- Run your benchmark queries here
SELECT count(), avg(value) FROM metrics WHERE ts >= today();

-- Ensure all timing data is persisted
SYSTEM FLUSH LOGS;

-- Analyze timing
SELECT
    query,
    query_duration_ms,
    read_rows,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND user = currentUser()
  AND event_time >= now() - INTERVAL 5 MINUTE
ORDER BY query_duration_ms DESC;
```

### Before reading part_log for a migration check

```sql
-- After running an INSERT SELECT migration
SYSTEM FLUSH LOGS;

SELECT
    event_type,
    table,
    rows,
    size_in_bytes,
    duration_ms
FROM system.part_log
WHERE event_time >= now() - INTERVAL 10 MINUTE
  AND table = 'events_archive'
ORDER BY event_time DESC;
```

### Verifying trace data from the query profiler

```sql
-- Enable the profiler for a session
SET query_profiler_real_time_period_ns = 100000000;

-- Run the query to profile
SELECT sum(value) FROM large_metrics;

-- Flush to capture all trace events
SYSTEM FLUSH LOGS;

-- Inspect the trace
SELECT
    trace_type,
    count()        AS samples,
    arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), trace), '\n') AS stack
FROM system.trace_log
WHERE query_id = (
    SELECT query_id
    FROM system.query_log
    WHERE type = 'QueryFinish'
    ORDER BY event_time DESC
    LIMIT 1
)
GROUP BY trace_type, trace
ORDER BY samples DESC
LIMIT 10;
```

## Summary

`SYSTEM FLUSH LOGS` forces all buffered ClickHouse system log data to be written to disk immediately, covering tables like `query_log`, `trace_log`, `part_log`, and more. Use it before querying system tables when you need the most recent data - after benchmarks, migrations, or debugging sessions. On ClickHouse 25.4+, you can target a specific log table to avoid unnecessary I/O.
