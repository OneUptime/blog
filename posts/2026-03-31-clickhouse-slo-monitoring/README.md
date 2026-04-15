# How to Build SLO Monitoring with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SLO, SLA, Reliability, Monitoring

Description: Build Service Level Objective monitoring in ClickHouse to track error budgets, compliance windows, and burn rate alerts.

---

SLO monitoring requires accurate, fast queries against large volumes of request and event data. ClickHouse lets you compute error budgets, multi-window burn rates, and compliance percentages directly from raw telemetry without a separate SLO tool.

## SLO Events Table

```sql
CREATE TABLE slo_events
(
    service_name LowCardinality(String),
    slo_name LowCardinality(String),
    is_good UInt8,
    latency_ms Float64 DEFAULT 0,
    recorded_at DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (service_name, slo_name, recorded_at);
```

## Current Error Rate and Compliance

```sql
SELECT
    service_name,
    slo_name,
    count() AS total_events,
    countIf(is_good = 1) AS good_events,
    countIf(is_good = 0) AS bad_events,
    round(countIf(is_good = 1) * 100.0 / count(), 4) AS current_reliability_pct,
    99.9 - round(countIf(is_good = 1) * 100.0 / count(), 4) AS compliance_delta
FROM slo_events
WHERE recorded_at >= now() - INTERVAL 30 DAY
GROUP BY service_name, slo_name;
```

## Error Budget Remaining

```sql
WITH 0.999 AS slo_target,
window_events AS (
    SELECT
        service_name,
        slo_name,
        count() AS total,
        countIf(is_good = 0) AS bad
    FROM slo_events
    WHERE recorded_at >= now() - INTERVAL 30 DAY
    GROUP BY service_name, slo_name
)
SELECT
    service_name,
    slo_name,
    total,
    bad,
    round(total * (1 - slo_target)) AS budget_total,
    round(total * (1 - slo_target)) - bad AS budget_remaining,
    round(
        (round(total * (1 - slo_target)) - bad) * 100.0 / round(total * (1 - slo_target)),
        2
    ) AS budget_remaining_pct
FROM window_events;
```

## Multi-Window Burn Rate

Compute burn rate over 1-hour and 6-hour windows to detect fast and slow budget burns.

```sql
SELECT
    service_name,
    slo_name,
    countIf(recorded_at >= now() - INTERVAL 1 HOUR AND is_good = 0) /
        nullIf(countIf(recorded_at >= now() - INTERVAL 1 HOUR), 0) /
        (1 - 0.999) AS burn_rate_1h,
    countIf(recorded_at >= now() - INTERVAL 6 HOUR AND is_good = 0) /
        nullIf(countIf(recorded_at >= now() - INTERVAL 6 HOUR), 0) /
        (1 - 0.999) AS burn_rate_6h
FROM slo_events
WHERE recorded_at >= now() - INTERVAL 6 HOUR
GROUP BY service_name, slo_name
ORDER BY burn_rate_1h DESC;
```

## SLO Compliance by Day

```sql
SELECT
    toDate(recorded_at) AS day,
    service_name,
    slo_name,
    round(countIf(is_good = 1) * 100.0 / count(), 4) AS daily_reliability_pct
FROM slo_events
WHERE recorded_at >= now() - INTERVAL 30 DAY
GROUP BY day, service_name, slo_name
ORDER BY day, service_name;
```

## Latency SLO - Requests Under Threshold

```sql
SELECT
    toDate(recorded_at) AS day,
    service_name,
    count() AS total_requests,
    countIf(latency_ms <= 200) AS within_latency_slo,
    round(countIf(latency_ms <= 200) * 100.0 / count(), 4) AS latency_slo_compliance_pct
FROM slo_events
WHERE recorded_at >= now() - INTERVAL 7 DAY
  AND slo_name = 'api_latency_200ms'
GROUP BY day, service_name
ORDER BY day;
```

## Alert - Fast Burn Rate Detection

```sql
SELECT
    service_name,
    slo_name,
    burn_rate_1h
FROM (
    SELECT
        service_name,
        slo_name,
        countIf(recorded_at >= now() - INTERVAL 1 HOUR AND is_good = 0) /
            nullIf(countIf(recorded_at >= now() - INTERVAL 1 HOUR), 0) /
            (1 - 0.999) AS burn_rate_1h
    FROM slo_events
    WHERE recorded_at >= now() - INTERVAL 1 HOUR
    GROUP BY service_name, slo_name
)
WHERE burn_rate_1h > 14.4;
```

## Summary

ClickHouse provides the query primitives needed for comprehensive SLO monitoring: compliance percentages, error budget calculations, multi-window burn rates, and daily reliability trends. The burn rate threshold of 14.4x is the Google SRE standard for a 1-hour fast burn alert that detects when approximately 2% of a 30-day error budget has been consumed in one hour. This approach replaces dedicated SLO tools for teams already using ClickHouse for telemetry.
