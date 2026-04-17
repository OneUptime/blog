# How to Set Up ClickHouse Alerts for Query Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alert, Query Timeout, Monitoring, Performance

Description: Configure query timeout alerts in ClickHouse to detect runaway queries, enforce SLAs, and prevent resource exhaustion from long-running analytical scans.

---

Query timeouts in ClickHouse can indicate runaway queries, missing indexes, data skew, or simply queries that need to be optimized. Setting up timeout alerts helps you catch these problems before they exhaust memory, block other queries, or violate user-facing SLAs.

## Detecting Timed-Out Queries

ClickHouse logs timed-out queries in `system.query_log` with the exception type `TIMEOUT_EXCEEDED`:

```sql
SELECT
    query_id,
    user,
    event_time,
    query_duration_ms,
    exception,
    substring(query, 1, 200) AS query_preview
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
    AND exception LIKE '%TIMEOUT_EXCEEDED%'
    AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Alerting on Timeout Rate

Track the timeout rate as a fraction of total queries:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    countIf(type = 'QueryFinish') AS successful,
    countIf(exception LIKE '%TIMEOUT_EXCEEDED%') AS timed_out,
    round(countIf(exception LIKE '%TIMEOUT_EXCEEDED%') / count() * 100, 2) AS timeout_pct
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
    AND type IN ('QueryFinish', 'ExceptionWhileProcessing')
GROUP BY minute
ORDER BY minute;
```

Alert when `timeout_pct` exceeds 1% to catch systematic issues early.

## Alerting on Long-Running Queries in Real Time

For real-time detection of queries that are about to time out, poll `system.processes`:

```bash
clickhouse-client --query "
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage) AS memory,
    substring(query, 1, 120) AS query
FROM system.processes
WHERE elapsed > 25
ORDER BY elapsed DESC
"
```

Run this check every 30 seconds and alert if any query has elapsed > 25 seconds (with a 30-second timeout configured).

## Prometheus Metrics for Timeout Alerting

```yaml
groups:
  - name: clickhouse_query_timeouts
    rules:
      - alert: ClickHouseQueryFailureRateHigh
        expr: |
          rate(ClickHouseProfileEvents_FailedQuery[5m]) /
          rate(ClickHouseProfileEvents_Query[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Query failure rate > 5% on {{ $labels.instance }}"

      - alert: ClickHouseAvgQueryDurationHigh
        expr: |
          rate(ClickHouseProfileEvents_QueryTimeMicroseconds[5m]) /
          rate(ClickHouseProfileEvents_Query[5m]) / 1e6 > 30
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Average query duration > 30s on {{ $labels.instance }}"
```

## Killing Timed-Out Queries Automatically

When a query exceeds `max_execution_time`, ClickHouse kills it automatically. But for manual intervention on stuck processes:

```sql
-- Find queries running longer than 60 seconds
SELECT query_id, user, elapsed FROM system.processes WHERE elapsed > 60;

-- Kill a specific query
KILL QUERY WHERE query_id = 'abc123-def456';
```

## Setting Per-User Timeout Profiles

Prevent timeouts by enforcing limits in user profiles:

```xml
<profiles>
  <dashboard_user>
    <max_execution_time>15</max_execution_time>
    <timeout_overflow_mode>throw</timeout_overflow_mode>
  </dashboard_user>

  <analyst>
    <max_execution_time>300</max_execution_time>
    <timeout_overflow_mode>throw</timeout_overflow_mode>
  </analyst>
</profiles>
```

## Alerting on Specific Users or Tables

```sql
SELECT
    user,
    count() AS timeouts,
    max(query_duration_ms) AS max_duration_ms
FROM system.query_log
WHERE exception LIKE '%TIMEOUT_EXCEEDED%'
    AND event_date = today()
GROUP BY user
ORDER BY timeouts DESC;
```

If one user or service account generates most timeouts, it usually indicates a specific query pattern that needs optimization.

## Summary

Query timeout alerts protect cluster stability by surfacing runaway queries early. Monitor the timeout rate from `system.query_log`, set per-user timeout profiles to enforce SLAs proactively, and use real-time polling of `system.processes` to catch long-running queries before they exhaust resources. Combine these signals with an alerting pipeline to your on-call team for immediate response.
