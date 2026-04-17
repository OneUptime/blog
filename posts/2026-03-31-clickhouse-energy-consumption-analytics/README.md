# How to Build Energy Consumption Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Energy, Analytics, Time Series, Aggregation, Materialized View

Description: Build an energy consumption analytics platform in ClickHouse to track usage trends, detect anomalies, and power real-time dashboards.

---

## Overview

Energy consumption analytics requires aggregating large volumes of time-series data across buildings, regions, and tariff categories. ClickHouse's columnar engine and rich aggregate functions make it well-suited for this use case, offering sub-second query times even over years of data.

## Core Table Structure

```sql
CREATE TABLE energy_consumption
(
    site_id         UInt32,
    meter_type      LowCardinality(String),
    recorded_at     DateTime,
    kwh             Float64,
    cost_usd        Float32,
    region          LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (site_id, recorded_at)
TTL recorded_at + INTERVAL 5 YEAR;
```

## Trend Analysis - Year-Over-Year Comparison

```sql
SELECT
    toYear(recorded_at)                          AS yr,
    toMonth(recorded_at)                         AS mo,
    round(sum(kwh), 2)                           AS total_kwh,
    round(sum(cost_usd), 2)                      AS total_cost
FROM energy_consumption
WHERE site_id = 501
  AND recorded_at >= '2022-01-01'
GROUP BY yr, mo
ORDER BY yr, mo;
```

## Anomaly Detection - Spike Detection

Flag hours where consumption exceeds twice the rolling average:

```sql
WITH hourly AS (
    SELECT
        site_id,
        toStartOfHour(recorded_at) AS hour,
        sum(kwh) AS kwh
    FROM energy_consumption
    WHERE recorded_at >= now() - INTERVAL 7 DAY
    GROUP BY site_id, hour
)
SELECT *
FROM (
    SELECT
        site_id,
        hour,
        kwh,
        avg(kwh) OVER (
            PARTITION BY site_id
            ORDER BY hour
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
        ) AS rolling_avg,
        kwh / rolling_avg AS spike_ratio
    FROM hourly
)
WHERE spike_ratio > 2.0
ORDER BY spike_ratio DESC;
```

## Peak Demand Analysis

```sql
SELECT
    site_id,
    toDayOfWeek(recorded_at)     AS day_of_week,
    toHour(recorded_at)          AS hour_of_day,
    avg(kwh)                     AS avg_kwh
FROM energy_consumption
WHERE recorded_at >= now() - INTERVAL 90 DAY
GROUP BY site_id, day_of_week, hour_of_day
ORDER BY avg_kwh DESC
LIMIT 20;
```

## Cost Breakdown by Region

```sql
SELECT
    region,
    toYYYYMM(recorded_at)        AS month,
    round(sum(cost_usd), 2)      AS total_cost,
    round(sum(kwh), 2)           AS total_kwh,
    round(sum(cost_usd) / sum(kwh), 4) AS cost_per_kwh
FROM energy_consumption
WHERE recorded_at >= today() - INTERVAL 365 DAY
GROUP BY region, month
ORDER BY region, month;
```

## Real-Time Dashboard Materialized View

```sql
CREATE TABLE energy_daily_summary
(
    site_id    UInt32,
    day        Date,
    total_kwh  SimpleAggregateFunction(sum, Float64),
    total_cost SimpleAggregateFunction(sum, Float32),
    peak_kwh   SimpleAggregateFunction(max, Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (site_id, day);

CREATE MATERIALIZED VIEW energy_daily_mv TO energy_daily_summary AS
SELECT
    site_id,
    toDate(recorded_at)  AS day,
    sum(kwh)             AS total_kwh,
    sum(cost_usd)        AS total_cost,
    max(kwh)             AS peak_kwh
FROM energy_consumption
GROUP BY site_id, day;
```

## Summary

ClickHouse enables fast energy consumption analytics through efficient columnar storage, window functions for anomaly detection, and materialized views for pre-computed daily summaries. This architecture supports dashboards, billing systems, and demand forecasting pipelines without requiring a separate OLAP layer.
