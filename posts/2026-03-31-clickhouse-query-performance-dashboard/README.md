# How to Build a ClickHouse Query Performance Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dashboard, Query Performance, Monitoring, Grafana

Description: Build a ClickHouse query performance dashboard using system tables to track slow queries, memory usage, and throughput in real time.

---

Monitoring query performance is essential for maintaining a healthy ClickHouse cluster. The `system.query_log` and `system.processes` tables provide rich data for building dashboards that show query latency distributions, resource consumption, and error rates.

## Key Metrics to Track

A query performance dashboard should cover:
- P50/P95/P99 query latency
- Queries per second (QPS)
- Memory usage per query
- Rows and bytes read per second
- Error rate and top error types
- Top slow queries by user and table

## Slow Query Summary Panel

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    quantile(0.50)(query_duration_ms) AS p50_ms,
    quantile(0.95)(query_duration_ms) AS p95_ms,
    quantile(0.99)(query_duration_ms) AS p99_ms,
    count() AS query_count
FROM system.query_log
WHERE type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Top Slow Queries Panel

```sql
SELECT
    query_id,
    user,
    query_duration_ms,
    formatReadableSize(memory_usage) AS memory,
    read_rows,
    substring(query, 1, 120) AS query_preview
FROM system.query_log
WHERE type = 'QueryFinish'
    AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

## Throughput Panel (Queries Per Second)

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    countIf(type = 'QueryStart') AS started,
    countIf(type = 'QueryFinish') AS finished,
    countIf(type = 'ExceptionWhileProcessing') AS errors
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Memory Usage by User

```sql
SELECT
    user,
    count() AS queries,
    formatReadableSize(avg(memory_usage)) AS avg_memory,
    formatReadableSize(max(memory_usage)) AS peak_memory,
    max(memory_usage) AS peak_memory_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
    AND event_date = today()
GROUP BY user
ORDER BY peak_memory_bytes DESC;
```

## Currently Running Queries

```sql
SELECT
    query_id,
    user,
    elapsed AS seconds_running,
    formatReadableSize(memory_usage) AS memory,
    read_rows,
    query
FROM system.processes
ORDER BY elapsed DESC
LIMIT 20;
```

This panel is best set to auto-refresh every 5-10 seconds to catch long-running queries in real time.

## Connecting to Grafana

ClickHouse provides a native Grafana data source plugin. Install it and configure it with your cluster endpoint:

```text
Host: http://clickhouse-host:8123
Database: default
Username: monitoring_user
Password: ****
```

Create a variable `$interval` with values `1 minute`, `5 minutes`, `1 hour` to make time-aggregation panels dynamic.

## Setting Up Alerts

Define an alert on the Grafana panel for P95 latency exceeding a threshold:

```text
Alert condition: p95_ms > 5000 for 3 consecutive evaluations
Notification: PagerDuty / Slack
```

You can also create alerts directly in ClickHouse using scheduled queries that write to an alert table, and have OneUptime poll that table for anomalies.

## Summary

A ClickHouse query performance dashboard gives your team instant visibility into latency trends, resource usage, and error rates. Build it using `system.query_log` queries for historical trends and `system.processes` for real-time activity. Pair with alerting thresholds on P95 latency and error rates to catch performance regressions before they impact users.
