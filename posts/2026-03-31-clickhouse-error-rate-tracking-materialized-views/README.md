# How to Build Error Rate Tracking with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Error Rate, Observability, SummingMergeTree

Description: Track service error rates in real time using ClickHouse materialized views that pre-aggregate error counts and total requests for instant SLO dashboards.

---

## Error Rate Tracking Requirements

SLO dashboards need error rates at multiple time granularities: per-minute for alerting, per-hour for operational reviews, and per-day for SLO compliance reports. Computing these on raw logs at query time is slow. Materialized views maintain these counters incrementally.

## Base Logs Table

```sql
CREATE TABLE service_logs
(
    log_time DateTime,
    service LowCardinality(String),
    endpoint LowCardinality(String),
    environment LowCardinality(String),
    status_code UInt16,
    error_class LowCardinality(String),
    error_message String,
    duration_ms UInt32,
    trace_id String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(log_time)
ORDER BY (service, environment, log_time);
```

## Error Rate Materialized View

```sql
CREATE TABLE error_rate_by_minute
(
    window_start DateTime,
    service LowCardinality(String),
    endpoint LowCardinality(String),
    environment LowCardinality(String),
    total_requests UInt64,
    error_5xx UInt64,
    error_4xx UInt64,
    error_timeouts UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(window_start)
ORDER BY (window_start, service, endpoint, environment);

CREATE MATERIALIZED VIEW error_rate_by_minute_mv
TO error_rate_by_minute
AS
SELECT
    toStartOfMinute(log_time) AS window_start,
    service,
    endpoint,
    environment,
    count() AS total_requests,
    countIf(status_code >= 500) AS error_5xx,
    countIf(status_code >= 400 AND status_code < 500) AS error_4xx,
    countIf(duration_ms > 5000) AS error_timeouts
FROM service_logs
GROUP BY window_start, service, endpoint, environment;
```

## Real-Time Error Rate Query

```sql
-- Current error rate per service (last 5 minutes)
SELECT
    service,
    environment,
    sum(total_requests) AS total,
    sum(error_5xx) AS server_errors,
    sum(error_4xx) AS client_errors,
    round(sum(error_5xx) / nullIf(sum(total_requests), 0) * 100, 3) AS error_rate_5xx_pct
FROM error_rate_by_minute
WHERE window_start >= now() - INTERVAL 5 MINUTE
  AND environment = 'production'
GROUP BY service, environment
ORDER BY error_rate_5xx_pct DESC;
```

## SLO Burn Rate Calculation

For error budget tracking:

```sql
-- 1-hour error budget burn rate vs SLO target of 99.9%
WITH budget AS (
    SELECT
        service,
        sum(total_requests) AS total,
        sum(error_5xx) AS errors,
        (1 - 0.999) AS error_budget_pct  -- 0.1% error budget
    FROM error_rate_by_minute
    WHERE window_start >= now() - INTERVAL 1 HOUR
    GROUP BY service
)
SELECT
    service,
    total,
    errors,
    round(errors / nullIf(total, 0) * 100, 4) AS actual_error_rate_pct,
    round((errors / nullIf(total, 0)) / error_budget_pct, 2) AS burn_rate
FROM budget
ORDER BY burn_rate DESC;
```

A burn rate of 14.4 sustained over 1 hour consumes 2% of a 30-day error budget and is the standard fast-burn page threshold from the Google SRE Workbook.

## Alerting Query Pattern

```sql
-- Services exceeding 1% error rate in the last 2 minutes
SELECT
    service,
    endpoint,
    sum(error_5xx) AS errors,
    sum(total_requests) AS total,
    round(sum(error_5xx) / sum(total_requests) * 100, 2) AS error_pct
FROM error_rate_by_minute
WHERE window_start >= now() - INTERVAL 2 MINUTE
GROUP BY service, endpoint
HAVING error_pct > 1.0;
```

## Summary

Error rate tracking with ClickHouse materialized views maintains rolling error counts in SummingMergeTree tables, enabling instant per-service error rate queries without scanning raw logs. This pattern supports real-time alerting, SLO burn rate calculations, and compliance dashboards. The pre-aggregated data reduces query time from seconds to milliseconds for operational monitoring use cases.
