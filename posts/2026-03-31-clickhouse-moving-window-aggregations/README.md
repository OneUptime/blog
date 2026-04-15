# How to Build Moving Window Aggregations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Moving Window, Window Function, Rolling Average, Analytics

Description: Learn how to build moving window aggregations in ClickHouse using ROWS and RANGE window frames for rolling averages, sums, and counts.

---

Moving window aggregations smooth noisy time-series data and reveal trends by computing metrics over a sliding window of preceding rows. ClickHouse supports `ROWS` and `RANGE` window frames.

## Rolling Average (Moving Mean)

A 7-row rolling average:

```sql
SELECT
    event_date,
    daily_revenue,
    avg(daily_revenue) OVER (
        ORDER BY event_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7day_avg
FROM daily_sales
ORDER BY event_date;
```

## Rolling Sum

```sql
SELECT
    ts,
    page_views,
    sum(page_views) OVER (
        ORDER BY ts
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS rolling_30min_views
FROM minute_stats
ORDER BY ts;
```

## Centered Moving Average

Look both backward and forward for a smoother signal:

```sql
SELECT
    event_date,
    value,
    avg(value) OVER (
        ORDER BY event_date
        ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    ) AS centered_7day_avg
FROM daily_metrics
ORDER BY event_date;
```

## RANGE Frame for Time-Based Windows

Use a RANGE frame to include all rows within a time distance:

```sql
SELECT
    ts,
    value,
    avg(value) OVER (
        ORDER BY toUnixTimestamp(ts)
        RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW
    ) AS rolling_1hr_avg
FROM sensor_readings
ORDER BY ts;
```

## Rolling Min and Max

```sql
SELECT
    ts,
    cpu_pct,
    min(cpu_pct) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) AS rolling_min,
    max(cpu_pct) OVER (ORDER BY ts ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) AS rolling_max
FROM host_metrics
ORDER BY ts;
```

## Partitioned Rolling Aggregation

Apply rolling windows per entity:

```sql
SELECT
    host,
    ts,
    cpu_pct,
    avg(cpu_pct) OVER (
        PARTITION BY host
        ORDER BY ts
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
    ) AS rolling_5min_avg
FROM host_metrics
ORDER BY host, ts;
```

## Summary

ClickHouse window functions support `ROWS BETWEEN` for row-count windows and `RANGE BETWEEN` for value/distance-based windows. Partition by entity columns for per-device or per-service rolling metrics, and combine `min`, `max`, `avg`, and `sum` in the same query for efficient multi-metric windows.
