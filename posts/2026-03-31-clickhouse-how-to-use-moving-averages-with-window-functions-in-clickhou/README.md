# How to Use Moving Averages with Window Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, Moving Average, Time Series, Smoothing

Description: Learn how to calculate simple moving averages (SMA), weighted moving averages, and exponential smoothing in ClickHouse using window functions.

---

## What Is a Moving Average

A moving average (rolling average) calculates the average of a value over a sliding window of rows. It smooths out noise in time series data to reveal underlying trends.

Types of moving averages:
- **Simple Moving Average (SMA)**: equal weight to all values in the window
- **Weighted Moving Average (WMA)**: more weight to recent values
- **Exponential Moving Average (EMA)**: geometrically decaying weights

## Simple Moving Average (7-Day)

```sql
CREATE TABLE daily_metrics (
    metric_date Date,
    value Float64
) ENGINE = MergeTree()
ORDER BY metric_date;

-- 7-day simple moving average
SELECT
    metric_date,
    value AS daily_value,
    avg(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS sma_7d
FROM daily_metrics
ORDER BY metric_date;
```

## Different Window Sizes

```sql
-- Multiple moving averages simultaneously
SELECT
    metric_date,
    value,
    round(avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS sma_3d,
    round(avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS sma_7d,
    round(avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW), 2) AS sma_14d,
    round(avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW), 2) AS sma_30d
FROM daily_metrics
ORDER BY metric_date;
```

## Moving Average with PARTITION BY

```sql
-- 7-day moving average per product
SELECT
    product_id,
    metric_date,
    daily_revenue,
    round(avg(daily_revenue) OVER (
        PARTITION BY product_id
        ORDER BY metric_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS revenue_sma_7d
FROM product_daily_revenue
ORDER BY product_id, metric_date;
```

## Handling Edge Cases at the Start

The first few rows don't have a full window. By default, ClickHouse computes the average over available rows:

```sql
-- Check how many rows are in each window (count of available preceding rows)
SELECT
    metric_date,
    value,
    count() OVER (
        ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS window_size,
    avg(value) OVER (
        ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS sma_7d,
    -- Only show SMA when full window is available
    if(
        count() OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) = 7,
        avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
        NULL
    ) AS sma_7d_full_window_only
FROM daily_metrics
ORDER BY metric_date;
```

## Weighted Moving Average

A WMA gives more weight to recent values:

```sql
-- 5-day WMA: weights [1, 2, 3, 4, 5] for oldest to newest
SELECT
    metric_date,
    value,
    -- Manually compute weighted average (ClickHouse uses lagInFrame, not lag)
    round((
        1 * lagInFrame(value, 4, 0) OVER (ORDER BY metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) +
        2 * lagInFrame(value, 3, 0) OVER (ORDER BY metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) +
        3 * lagInFrame(value, 2, 0) OVER (ORDER BY metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) +
        4 * lagInFrame(value, 1, 0) OVER (ORDER BY metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) +
        5 * value
    ) / 15, 2) AS wma_5d  -- 1+2+3+4+5 = 15
FROM daily_metrics
ORDER BY metric_date;
```

## Bollinger Bands (SMA + Standard Deviation)

```sql
-- 20-day Bollinger Bands for volatility analysis
SELECT
    metric_date,
    value,
    avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS sma_20d,
    stddevPop(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS stddev_20d,
    -- Upper band: SMA + 2*stddev
    avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) +
    2 * stddevPop(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS upper_band,
    -- Lower band: SMA - 2*stddev
    avg(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) -
    2 * stddevPop(value) OVER (ORDER BY metric_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS lower_band
FROM daily_metrics
ORDER BY metric_date;
```

## Practical Example: Revenue Smoothing for Dashboards

```sql
CREATE TABLE revenue_events (
    event_ts DateTime,
    revenue Float64,
    channel LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY event_ts;

-- Hourly data with smoothed trend
-- ClickHouse does not allow window functions over aggregates in the same query,
-- so aggregate first in a subquery, then apply the window function outside.
SELECT
    hour,
    hourly_revenue,
    avg(hourly_revenue) OVER (
        ORDER BY hour
        ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
    ) AS sma_24h
FROM (
    SELECT
        toStartOfHour(event_ts) AS hour,
        sum(revenue) AS hourly_revenue
    FROM revenue_events
    GROUP BY hour
)
ORDER BY hour;
```

## Summary

Moving averages in ClickHouse use `avg() OVER (ORDER BY ... ROWS BETWEEN N PRECEDING AND CURRENT ROW)` to compute sliding window averages. The window size is controlled by the `N PRECEDING` value. Use multiple window sizes to show short-term and long-term trends simultaneously. For partial windows at the start of a series, ClickHouse automatically averages over available rows, but you can filter to only show full-window averages. Extend the pattern with `stddevPop()` in the window to compute Bollinger Bands or other volatility metrics.
