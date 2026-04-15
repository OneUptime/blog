# How to Monitor ClickHouse Query Queue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query, Performance, Monitoring, Concurrency, System Table

Description: Learn how to monitor the ClickHouse query queue, track concurrency limits, identify queued and throttled queries, and tune thread pool settings for optimal throughput.

---

ClickHouse processes queries concurrently using a fixed-size thread pool. When all threads are occupied, new queries queue up and wait. Understanding queue depth, wait times, and the relationship between active queries and thread pool capacity is essential for diagnosing latency spikes and capacity problems.

## Understanding ClickHouse Concurrency Model

ClickHouse uses several thread pools to process different types of work:

```text
Query processing threads:     max_threads (default: CPU cores)
Background merge threads:     background_pool_size (default: 16)
Background fetch threads:     background_fetches_pool_size (default: 8)
Mark cache loader threads:    max_threads_for_disk_io (default: 64)
IO threads:                   background_io_pool_size (default: 4)
```

When `max_concurrent_queries` is reached, new queries are queued or rejected.

## Checking Current Query Activity

```sql
-- Count of active and waiting queries
SELECT
    (SELECT count() FROM system.processes)                         AS active_queries,
    (SELECT value FROM system.metrics WHERE metric = 'Query')      AS tracked_queries,
    (SELECT value FROM system.metrics WHERE metric = 'DelayedInserts') AS delayed_inserts,
    (SELECT value FROM system.server_settings WHERE name = 'max_concurrent_queries') AS max_concurrent;
```

List all running queries with elapsed time:

```sql
SELECT
    query_id,
    user,
    client_hostname,
    elapsed,
    read_rows,
    formatReadableSize(read_bytes)   AS bytes_read,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.processes
ORDER BY elapsed DESC;
```

## Monitoring Thread Pool Utilization

Check the current thread pool metrics:

```sql
SELECT metric, value, description
FROM system.metrics
WHERE metric IN (
    'GlobalThread',
    'GlobalThreadActive',
    'LocalThread',
    'LocalThreadActive',
    'BackgroundPoolTask',
    'BackgroundFetchesPoolTask',
    'BackgroundMovePoolTask',
    'IOThreadPoolSize',
    'IOThreadPoolActiveTasks'
);
```

Thread pool saturation ratio:

```sql
SELECT
    'IO Thread Pool' AS pool,
    (SELECT value FROM system.metrics WHERE metric = 'IOThreadPoolActiveTasks') AS active,
    (SELECT value FROM system.metrics WHERE metric = 'IOThreadPoolSize') AS total,
    round(
        (SELECT value FROM system.metrics WHERE metric = 'IOThreadPoolActiveTasks') * 100.0
        / nullIf((SELECT value FROM system.metrics WHERE metric = 'IOThreadPoolSize'), 0)
    , 1) AS utilization_pct;
```

## Tracking Query Queue Depth from Events

Use `system.events` to measure cumulative query wait events:

```sql
SELECT
    event,
    value,
    description
FROM system.events
WHERE event IN (
    'QueryMemoryLimitExceeded',
    'RejectedInserts',
    'DelayedInserts',
    'DelayedInsertsMilliseconds',
    'SelectedRows',
    'SelectedBytes',
    'QueryTimeMicroseconds',
    'SelectQueryTimeMicroseconds'
)
ORDER BY event;
```

Compute the insert delay rate to detect write pressure:

```sql
SELECT
    'RejectedInserts' AS event,
    (SELECT value FROM system.events WHERE event = 'RejectedInserts') / uptime() AS per_second,
    'DelayedInserts' AS event2,
    (SELECT value FROM system.events WHERE event = 'DelayedInserts') / uptime() AS delayed_per_second;
```

## Detecting Queries That Are Stuck

Queries waiting for locks or resources do not always appear in `system.processes` with high CPU. Look for queries that are old but have not read much data:

```sql
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.processes
WHERE
    elapsed > 10
    AND read_rows < 1000
ORDER BY elapsed DESC;
```

Also check for queries waiting on semaphores or IO:

```sql
SELECT
    query_id,
    thread_id,
    thread_name,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS cpu_time_us,
    ProfileEvents['OSCPUWaitMicroseconds']        AS wait_time_us,
    ProfileEvents['OSCPUWaitMicroseconds'] / (ProfileEvents['OSCPUVirtualTimeMicroseconds'] + 1) AS wait_ratio
FROM system.query_thread_log
WHERE
    event_time >= now() - INTERVAL 5 MINUTE
    AND ProfileEvents['OSCPUWaitMicroseconds'] > ProfileEvents['OSCPUVirtualTimeMicroseconds']
ORDER BY wait_ratio DESC
LIMIT 20;
```

## Profiling Wait Times from query_log

Analyze historical data to understand average queue and execution time:

```sql
SELECT
    toStartOfMinute(event_time)          AS minute,
    count()                               AS query_count,
    avg(query_duration_ms)                AS avg_duration_ms,
    max(query_duration_ms)                AS max_duration_ms,
    quantile(0.95)(query_duration_ms)     AS p95_ms,
    quantile(0.99)(query_duration_ms)     AS p99_ms,
    countIf(query_duration_ms > 5000)     AS slow_queries
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
    AND is_initial_query = 1
GROUP BY minute
ORDER BY minute;
```

## Configuring Concurrency Limits

Tune the concurrency settings in a configuration override:

```bash
sudo tee /etc/clickhouse-server/config.d/concurrency.xml > /dev/null <<'EOF'
<clickhouse>
    <!-- Maximum concurrent queries (default 100) -->
    <max_concurrent_queries>200</max_concurrent_queries>

    <!-- Maximum concurrent queries per user -->
    <max_concurrent_queries_for_user>50</max_concurrent_queries_for_user>

    <!-- Maximum number of queries waiting in queue when max_concurrent_queries is reached -->
    <max_waiting_queries>50</max_waiting_queries>

    <!-- Background pool sizes -->
    <background_pool_size>16</background_pool_size>
    <background_fetches_pool_size>8</background_fetches_pool_size>
    <background_move_pool_size>8</background_move_pool_size>
    <background_common_pool_size>8</background_common_pool_size>

    <!-- IO thread pool -->
    <max_io_thread_pool_size>100</max_io_thread_pool_size>
</clickhouse>
EOF
```

Apply per-user concurrency limits:

```sql
-- Limit a specific user to 10 concurrent queries
ALTER USER reporting_user SETTINGS max_concurrent_queries_for_user = 10;

-- Set max threads for a query (overrides server default)
SET max_threads = 4;  -- Use only 4 threads for this session
```

## Setting Up a Query Queue Monitor

Create a continuous monitor that logs queue depth every 10 seconds:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-queue-monitor.sh
while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    stats=$(clickhouse-client --format TabSeparated --query "
    SELECT
        count()                                  AS active,
        countIf(elapsed > 30)                   AS long_running,
        max(elapsed)                             AS max_elapsed_s,
        sum(read_rows)                           AS total_rows_in_flight
    FROM system.processes
    ")
    echo "${timestamp} ${stats}"
    sleep 10
done
```

## Alerting on Queue Saturation

Prometheus alerting rule for query queue overload:

```text
# Alert when more than 10 queries have been running for over 60 seconds
- alert: ClickHouseLongRunningQueries
  expr: >
    count(clickhouse_process_elapsed_seconds > 60) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "{{ $value }} long-running queries on {{ $labels.instance }}"
```

ClickHouse also exposes `ClickHouseMetrics_Query` which you can alert on directly:

```text
ClickHouseMetrics_Query > 100
```

## Summary

Monitoring the ClickHouse query queue involves tracking active query count via `system.processes`, monitoring thread pool saturation through `system.metrics`, analyzing historical wait and duration patterns from `system.query_log`, and watching for delayed or rejected inserts through `system.events`. When queue depth grows, tune `max_concurrent_queries`, per-user limits, and background pool sizes, and use `max_threads` at the session level to ensure analytical queries do not monopolize all available threads.
