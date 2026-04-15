# How to Compute Moving Averages with Window Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Time Series, Analytics

Description: Learn how to compute simple and weighted moving averages in ClickHouse using AVG() window functions and frame specifications, with time series examples.

---

A moving average (also called a rolling average) smooths a time series by averaging values over a sliding window of N consecutive periods. It reduces noise, reveals trends, and is a staple of financial analysis, monitoring dashboards, and operational metrics. In ClickHouse, moving averages can be computed using `AVG()` as a window function with a bounded `ROWS BETWEEN` frame, or with the dedicated aggregate function `exponentialMovingAverage()` for exponentially weighted variants.

## Syntax for a Simple Moving Average

```text
AVG(expr) OVER (
    [PARTITION BY partition_expr [, ...]]
    ORDER BY sort_expr ASC
    ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW
)
```

A 3-period moving average uses `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` (2 preceding rows plus the current row = 3 rows total).

## 3-Day Simple Moving Average

The following query computes a 3-day moving average of daily revenue:

```sql
SELECT
    sale_date,
    daily_revenue,
    AVG(daily_revenue) OVER (
        ORDER BY sale_date ASC
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS ma_3d
FROM daily_sales
ORDER BY sale_date;
```

For the first two rows, there are fewer than 3 rows in the frame. ClickHouse averages whatever rows are available, so `ma_3d` for the first row equals `daily_revenue` itself, and for the second row it averages 2 days. This is called a "warm-up" period.

## 7-Day and 30-Day Moving Averages

Include multiple moving average windows in one query to compare short-term and long-term trends:

```sql
SELECT
    sale_date,
    daily_revenue,
    ROUND(AVG(daily_revenue) OVER (
        ORDER BY sale_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS ma_7d,
    ROUND(AVG(daily_revenue) OVER (
        ORDER BY sale_date ASC
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 2) AS ma_30d
FROM daily_sales
WHERE sale_date >= '2025-01-01'
ORDER BY sale_date;
```

When `ma_7d` crosses above `ma_30d`, it is often interpreted as a bullish signal; crossing below is bearish. This crossover pattern is a common metric in financial dashboards.

## Moving Average Per Partition

Use `PARTITION BY` to compute independent moving averages for each group. This example computes a 7-day moving average of page views for each product page:

```sql
SELECT
    page_id,
    view_date,
    daily_views,
    ROUND(AVG(daily_views) OVER (
        PARTITION BY page_id
        ORDER BY view_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 1) AS ma_7d_views
FROM page_daily_views
ORDER BY page_id, view_date;
```

Each page's moving average is computed independently - the window does not cross from one page to another.

## Moving Average of a Non-Revenue Metric

Moving averages apply to any numeric time series. This computes a 5-minute rolling average of server response time:

```sql
SELECT
    minute_bucket,
    avg_response_ms,
    ROUND(AVG(avg_response_ms) OVER (
        ORDER BY minute_bucket ASC
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
    ), 2) AS rolling_5min_avg_ms
FROM server_metrics_by_minute
WHERE server_id = 'web-01'
  AND minute_bucket >= now() - INTERVAL 1 HOUR
ORDER BY minute_bucket;
```

## Excluding Incomplete Windows (Warm-Up Period)

If you want strict N-period averages only (no partial windows at the start), filter on the row number:

```sql
SELECT
    sale_date,
    daily_revenue,
    ma_7d
FROM (
    SELECT
        sale_date,
        daily_revenue,
        AVG(daily_revenue) OVER (
            ORDER BY sale_date ASC
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS ma_7d,
        ROW_NUMBER() OVER (ORDER BY sale_date ASC) AS rn
    FROM daily_sales
)
WHERE rn >= 7
ORDER BY sale_date;
```

Rows 1 through 6 (the warm-up period) are excluded, and from row 7 onward every `ma_7d` value is based on exactly 7 days of data.

## Weighted Moving Average

A weighted moving average (WMA) assigns higher weights to more recent values. ClickHouse does not have a built-in WMA function, but it can be computed with `SUM()` and conditional arithmetic:

```sql
-- 3-day WMA: weights 1, 2, 3 (most recent = weight 3)
SELECT
    sale_date,
    daily_revenue,
    ROUND(
        (
            1 * LAG(daily_revenue, 2, daily_revenue) OVER (ORDER BY sale_date ASC)
          + 2 * LAG(daily_revenue, 1, daily_revenue) OVER (ORDER BY sale_date ASC)
          + 3 * daily_revenue
        ) / 6.0,
        2
    ) AS wma_3d
FROM daily_sales
ORDER BY sale_date;
```

The denominator is the sum of weights (1 + 2 + 3 = 6). Adjust the weights and denominator for different window sizes.

## Exponential Moving Average with exponentialMovingAverage()

ClickHouse provides `exponentialMovingAverage(x)(value, timeunit)` as a parametric aggregate function for EMA calculation. The parameter `x` is the half-life period (the time lag at which the exponential weights decay by one-half), and `timeunit` is a time interval index, not a raw timestamp. Use `intDiv` to convert timestamps to interval indices. The function can also be used as a window function with an `OVER` clause:

```sql
SELECT
    day,
    daily_avg,
    exponentialMovingAverage(3)(daily_avg, day_index)
        OVER (ORDER BY day ASC) AS ema_halflife_3
FROM (
    SELECT
        toStartOfDay(event_time) AS day,
        intDiv(toUnixTimestamp(toStartOfDay(event_time)), 86400) AS day_index,
        AVG(metric_value) AS daily_avg
    FROM metric_events
    WHERE metric_name = 'request_rate'
    GROUP BY day, day_index
)
ORDER BY day;
```

The half-life parameter `x` controls the decay rate. A half-life of 3 means the weight assigned to a data point drops by half for every 3 time units of distance. Smaller half-life values make the EMA more reactive to recent values; larger values produce a smoother, slower-moving average.

## Comparing Simple MA and EMA

To understand the difference between simple and exponential moving averages, run them side by side:

```sql
SELECT
    sale_date,
    daily_revenue,
    ROUND(AVG(daily_revenue) OVER (
        ORDER BY sale_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS sma_7d
FROM daily_sales
ORDER BY sale_date;
```

```sql
-- EMA as a window function over pre-aggregated daily data
SELECT
    sale_date,
    daily_revenue,
    ROUND(exponentialMovingAverage(3)(daily_revenue, day_index)
        OVER (ORDER BY sale_date ASC), 2) AS ema_halflife_3
FROM (
    SELECT
        toStartOfDay(sale_datetime) AS sale_date,
        intDiv(toUnixTimestamp(toStartOfDay(sale_datetime)), 86400) AS day_index,
        SUM(revenue) AS daily_revenue
    FROM sales_raw
    GROUP BY sale_date, day_index
)
ORDER BY sale_date;
```

Simple MA treats all N periods equally. EMA weights recent periods more heavily. Use SMA for broad trend direction and EMA for responsive anomaly detection.

## Moving Average for Anomaly Detection

Flag days where the actual value deviates from the moving average by more than 2 standard deviations:

```sql
SELECT
    metric_date,
    metric_value,
    AVG(metric_value) OVER (
        ORDER BY metric_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS ma_7d,
    stddevPop(metric_value) OVER (
        ORDER BY metric_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS stddev_7d,
    ABS(metric_value - AVG(metric_value) OVER (
        ORDER BY metric_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )) > 2 * stddevPop(metric_value) OVER (
        ORDER BY metric_date ASC
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS is_anomaly
FROM daily_metrics
WHERE metric_name = 'error_rate'
ORDER BY metric_date;
```

## Summary

Moving averages in ClickHouse are computed with `AVG() OVER (ORDER BY ... ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW)`. Key considerations include: the warm-up period for the first N-1 rows (filter with `ROW_NUMBER()` if strict N-period windows are needed), independent per-group moving averages via `PARTITION BY`, and the choice between simple MA (equal weights), weighted MA (manual `LAG()` arithmetic), and exponential MA (the `exponentialMovingAverage()` aggregate function). For time series stored in `MergeTree` tables, pre-sorting on the time column minimizes the overhead of the internal sort required by the window function.
