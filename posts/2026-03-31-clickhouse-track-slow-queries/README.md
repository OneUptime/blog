# How to Track Slow Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Query Optimization, Monitoring, Slow Query, System Table

Description: Learn how to identify, log, and analyze slow queries in ClickHouse using query_log, query_thread_log, and built-in profiling tools to find and fix performance bottlenecks.

---

Slow queries degrade user experience and consume resources that affect the entire cluster. ClickHouse provides several mechanisms to capture, store, and analyze slow query data: the `query_log` system table, per-thread logs, query profiling settings, and the `EXPLAIN` pipeline analyzer. This guide covers how to set up slow query logging and systematically find the worst offenders.

## Enabling query_log

ClickHouse logs all queries by default to `system.query_log`. Verify it is active and check its retention settings:

```sql
-- Check if query_log is enabled
SELECT name, value
FROM system.settings
WHERE name IN ('log_queries', 'log_query_threads', 'log_queries_min_query_duration_ms');
```

Tune the settings in `config.xml` or via a merge tree configuration file:

```bash
sudo tee /etc/clickhouse-server/config.d/query-log.xml > /dev/null <<'EOF'
<clickhouse>
    <query_log>
        <database>system</database>
        <table>query_log</table>
        <engine>
            ENGINE = MergeTree
            PARTITION BY toYYYYMM(event_date)
            ORDER BY (event_date, event_time)
            TTL event_date + INTERVAL 30 DAY
            SETTINGS index_granularity = 1024
        </engine>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_log>
    <log_queries>1</log_queries>
    <log_queries_min_query_duration_ms>0</log_queries_min_query_duration_ms>
</clickhouse>
EOF

sudo systemctl restart clickhouse-server
```

Set the minimum query duration to log only queries slower than 1 second for a specific user:

```sql
ALTER USER analytics_user SETTINGS log_queries_min_query_duration_ms = 1000;
```

Or set it per session:

```sql
SET log_queries_min_query_duration_ms = 500;
SET log_queries = 1;
SET log_query_threads = 1;
```

## Finding the Slowest Queries

Query `system.query_log` to find the worst offenders over the last 24 hours:

```sql
SELECT
    query_id,
    user,
    query_duration_ms,
    read_rows,
    read_bytes,
    result_rows,
    memory_usage,
    formatReadableSize(memory_usage) AS memory_readable,
    formatReadableSize(read_bytes)   AS read_bytes_readable,
    query
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 24 HOUR
    AND is_initial_query = 1
ORDER BY query_duration_ms DESC
LIMIT 20;
```

Aggregate by normalized query pattern to find the most expensive query types:

```sql
SELECT
    normalizeQuery(query) AS normalized,
    count()               AS call_count,
    avg(query_duration_ms) AS avg_ms,
    max(query_duration_ms) AS max_ms,
    sum(read_rows)         AS total_rows_read,
    formatReadableSize(sum(read_bytes)) AS total_bytes_read
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 24 HOUR
    AND is_initial_query = 1
GROUP BY normalized
ORDER BY avg_ms DESC
LIMIT 20;
```

## Identifying Queries that Read the Most Data

Memory-hungry or scan-heavy queries are often more damaging than slow queries:

```sql
SELECT
    query_id,
    user,
    formatReadableSize(read_bytes)   AS data_read,
    formatReadableSize(memory_usage) AS memory_used,
    query_duration_ms,
    query
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
    AND is_initial_query = 1
ORDER BY read_bytes DESC
LIMIT 10;
```

## Tracking Currently Running Slow Queries

Inspect queries that are running right now:

```sql
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    formatReadableSize(read_bytes) AS read_bytes,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.processes
WHERE elapsed > 5
ORDER BY elapsed DESC;
```

Kill a runaway query:

```sql
KILL QUERY WHERE query_id = 'abc123-your-query-id' ASYNC;
```

## Analyzing Slow Queries with EXPLAIN

Once you identify a slow query, use `EXPLAIN` to understand the execution plan:

```sql
-- Show the logical query plan
EXPLAIN
SELECT
    toStartOfHour(event_time) AS hour,
    count()                   AS events
FROM events
WHERE event_date >= today() - 7
GROUP BY hour
ORDER BY hour;
```

Show the physical pipeline:

```sql
EXPLAIN PIPELINE
SELECT
    toStartOfHour(event_time) AS hour,
    count()                   AS events
FROM events
WHERE event_date >= today() - 7
GROUP BY hour
ORDER BY hour;
```

Show whether indexes are being used:

```sql
EXPLAIN indexes = 1
SELECT *
FROM events
WHERE user_id = 12345 AND event_date = today();
```

## Using Query Profiling

Enable sampling-based CPU profiling for a single query to find hot functions:

```sql
SET query_profiler_real_time_period_ns = 100000000;  -- 100ms real time
SET query_profiler_cpu_time_period_ns  = 100000000;  -- 100ms CPU time

SELECT
    arrayStringConcat(arrayReverse(arrayMap(x -> demangle(addressToSymbol(x)), trace)), ' -> ') AS stack_trace,
    count()
FROM system.trace_log
WHERE query_id = 'your-slow-query-id'
GROUP BY trace
ORDER BY count() DESC
LIMIT 20;
```

## Correlating with Thread-Level Stats

`system.query_thread_log` shows per-thread breakdown for parallel queries:

```sql
SELECT
    query_id,
    thread_name,
    thread_id,
    query_duration_ms,
    read_rows,
    formatReadableSize(read_bytes) AS read_bytes_readable,
    peak_memory_usage
FROM system.query_thread_log
WHERE
    query_id = 'your-slow-query-id'
ORDER BY read_bytes DESC;
```

## Setting Query Complexity Limits

Prevent queries from running out of control by setting limits at the user or profile level:

```sql
CREATE SETTINGS PROFILE slow_query_guard
    SETTINGS
        max_execution_time = 30,              -- seconds
        max_rows_to_read   = 1000000000,      -- 1 billion rows
        max_bytes_to_read  = 10000000000,     -- 10 GB
        max_memory_usage   = 8000000000,      -- 8 GB per query
        max_result_rows    = 1000000,
        read_overflow_mode = 'throw',
        timeout_overflow_mode = 'throw';

ALTER USER analytics_user SETTINGS PROFILE 'slow_query_guard';
```

## Building a Slow Query Report

Run this weekly report to track query performance trends:

```sql
SELECT
    toDate(event_time)        AS day,
    count()                   AS total_queries,
    countIf(query_duration_ms > 1000)  AS queries_over_1s,
    countIf(query_duration_ms > 10000) AS queries_over_10s,
    max(query_duration_ms)    AS worst_query_ms,
    avg(query_duration_ms)    AS avg_query_ms,
    quantile(0.95)(query_duration_ms) AS p95_ms,
    quantile(0.99)(query_duration_ms) AS p99_ms
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 7 DAY
    AND is_initial_query = 1
GROUP BY day
ORDER BY day;
```

## Summary

Tracking slow queries in ClickHouse involves enabling `query_log` with appropriate retention, querying `system.query_log` to find the slowest and most resource-intensive patterns using `normalizeQuery` to group similar queries, using `EXPLAIN` with `indexes = 1` to check whether primary key and skip index pruning is working, and applying per-user query complexity limits to prevent runaway workloads. Combining periodic reports with real-time process inspection gives you complete coverage of query performance issues.
