# How to Build Trend Analysis Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Trend Analysis, Moving Average, Linear Regression, Analytics

Description: Learn how to build trend analysis reports in ClickHouse using moving averages, linear regression, and growth rate calculations over time series data.

---

## Trend Analysis in ClickHouse

Trend analysis reveals whether a metric is growing, declining, or stable over time. ClickHouse provides window functions for moving averages, and `simpleLinearRegression` for quantifying the direction and magnitude of trends.

## Sample Time Series Data

```sql
CREATE TABLE daily_metrics
(
    day Date,
    metric_name String,
    value Float64
)
ENGINE = MergeTree()
ORDER BY (metric_name, day);
```

## Simple Moving Average

```sql
SELECT
    day,
    value,
    avg(value) OVER (
        PARTITION BY metric_name
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS sma_7d,
    avg(value) OVER (
        PARTITION BY metric_name
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS sma_30d
FROM daily_metrics
WHERE metric_name = 'revenue'
ORDER BY day;
```

## Exponential Moving Average (EMA)

ClickHouse provides `exponentialMovingAverage` as an aggregate function. You can also approximate EMA with exponential decay weights using a self-join:

```sql
SELECT
    a.day,
    a.value,
    -- Approximate EMA using exponential decay weights over a 10-day window
    sum(b.value * exp(-0.1 * (a.day - b.day)))
        / sum(exp(-0.1 * (a.day - b.day))) AS ema_approx
FROM daily_metrics a
JOIN daily_metrics b
    ON b.metric_name = a.metric_name
    AND b.day BETWEEN a.day - 10 AND a.day
WHERE a.metric_name = 'active_users'
GROUP BY a.day, a.value
ORDER BY a.day;
```

## Linear Regression Slope

Quantify the trend direction and rate per day:

```sql
SELECT
    metric_name,
    reg.1 AS slope_per_day,
    reg.2 AS intercept
FROM (
    SELECT
        metric_name,
        simpleLinearRegression(toUInt32(day), value) AS reg
    FROM daily_metrics
    GROUP BY metric_name
);
```

Positive slope means growth; negative means decline.

## Week-over-Week Growth Rate

```sql
SELECT
    day,
    value,
    lagInFrame(value, 7) OVER (PARTITION BY metric_name ORDER BY day) AS prior_week,
    round(
        (value - lagInFrame(value, 7) OVER (PARTITION BY metric_name ORDER BY day)) /
        lagInFrame(value, 7) OVER (PARTITION BY metric_name ORDER BY day) * 100, 2
    ) AS wow_pct
FROM daily_metrics
WHERE metric_name = 'revenue'
ORDER BY day;
```

## Trend Segmentation

Classify periods as accelerating, stable, or declining:

```sql
WITH trend AS (
    SELECT
        day,
        value,
        avg(value) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS sma7,
        avg(value) OVER (ORDER BY day ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS sma30
    FROM daily_metrics
    WHERE metric_name = 'revenue'
)
SELECT
    day,
    value,
    sma7,
    sma30,
    multiIf(sma7 > sma30 * 1.05, 'accelerating',
             sma7 < sma30 * 0.95, 'declining',
             'stable') AS trend_label
FROM trend
ORDER BY day;
```

## Correlation Between Two Metrics

```sql
SELECT
    corr(a.value, b.value) AS correlation
FROM daily_metrics a
JOIN daily_metrics b ON a.day = b.day
WHERE a.metric_name = 'marketing_spend'
  AND b.metric_name = 'revenue';
```

## Summary

Trend analysis in ClickHouse uses window-based moving averages, `simpleLinearRegression` for slope calculation, and growth rate formulas with `lagInFrame`. Combine moving average crossovers with `multiIf` to segment trend periods into labeled classifications.
