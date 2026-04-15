# How to Monitor Materialized View Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Performance, Monitoring, System Table

Description: Learn how to monitor ClickHouse materialized view performance using system tables, query logs, and metrics to detect lag and slow processing.

---

## Key Performance Concerns

Materialized views add overhead to every insert into the source table. Slow view processing can block inserts, cause memory pressure, and create replication lag. Monitoring view performance is essential in production.

## Check View Processing Time via Query Log

```sql
SELECT
    query_id,
    event_time,
    query_duration_ms,
    written_rows,
    written_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE query LIKE '%INSERT INTO%.%'
  AND type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY query_duration_ms DESC
LIMIT 20;
```

## Monitor Insert Latency

Track how long inserts into source tables take (view processing is included):

```sql
SELECT
    tables[1] AS source_table,
    avg(query_duration_ms) AS avg_insert_ms,
    max(query_duration_ms) AS max_insert_ms,
    quantile(0.95)(query_duration_ms) AS p95_insert_ms,
    count() AS insert_count
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY source_table;
```

## Check Target Table Row Counts

Verify data is flowing into the view's target table:

```sql
SELECT
    database,
    table,
    total_rows,
    total_bytes,
    formatReadableSize(total_bytes) AS size
FROM system.tables
WHERE table IN ('events_hourly', 'events_daily', 'events_per_minute')
ORDER BY table;
```

## Detect Processing Lag

Compare the latest event time in source vs. target:

```sql
SELECT
    'source' AS tbl,
    max(event_time) AS latest_event
FROM raw_events
UNION ALL
SELECT
    'target' AS tbl,
    max(hour) AS latest_event
FROM events_hourly;
```

## Monitor Memory Usage During View Processing

```sql
SELECT
    query_id,
    memory_usage,
    formatReadableSize(memory_usage) AS readable_memory,
    query_duration_ms,
    written_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND written_rows > 0
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY memory_usage DESC
LIMIT 10;
```

## Check for View Exceptions

```sql
SELECT
    event_time,
    exception,
    query
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC;
```

## Set Up Prometheus Monitoring

ClickHouse exposes metrics via the Prometheus endpoint. You can query materialized view insert activity from system tables and export them via Prometheus:

```sql
SELECT
    event,
    value
FROM system.events
WHERE event LIKE '%InsertedRows%'
   OR event LIKE '%InsertQuery%';
```

Combine these with custom Grafana dashboards that track insert duration from `system.query_log` to visualize view processing time over time.

## Optimize Slow Views

If a view is slow, review its SELECT for expensive operations:

```sql
-- Use EXPLAIN to analyze the view's query plan
EXPLAIN
SELECT toStartOfHour(event_time), count()
FROM raw_events
GROUP BY 1;
```

## Summary

Monitoring ClickHouse materialized view performance requires querying `system.query_log` for insert durations, checking target table freshness, and watching for exceptions. Set up Prometheus metrics and Grafana dashboards to get proactive alerts when view processing time degrades.
