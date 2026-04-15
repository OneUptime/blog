# How to Use simpleLinearRegression() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Linear Regression, Statistics

Description: Learn how to use simpleLinearRegression() in ClickHouse to fit a line y=kx+b to your data and forecast trends using pure SQL aggregate functions.

---

Forecasting and trend analysis are common needs in observability and analytics - projecting when a disk will fill, estimating future request counts, or understanding the rate at which error counts grow. ClickHouse's `simpleLinearRegression(x, y)` function fits a least-squares line y = k*x + b to a dataset in a single aggregate pass, returning the slope k and intercept b as a tuple. No external tooling or Python scripts are required; the regression lives entirely in SQL.

## How simpleLinearRegression() Works

The function computes ordinary least squares (OLS) linear regression between two numeric columns x (the predictor) and y (the response). It returns a `Tuple(Float64, Float64)` where the first element is the slope k and the second is the intercept b.

```sql
-- Returns (k, b) where y = k*x + b
SELECT simpleLinearRegression(x_column, y_column) FROM table_name;
```

Use `tupleElement()` to extract individual components.

```sql
SELECT
    tupleElement(simpleLinearRegression(x_col, y_col), 1) AS slope,
    tupleElement(simpleLinearRegression(x_col, y_col), 2) AS intercept
FROM table_name;
```

## Fitting Time as the Predictor

The most common use case is using Unix timestamps (or sequential integers) as x and a metric as y, then extrapolating to a future time.

### Forecasting Disk Usage Growth

```sql
-- Fit a line to the past 7 days of disk usage
SELECT
    tupleElement(simpleLinearRegression(ts, used_gb), 1) AS gb_per_second,
    tupleElement(simpleLinearRegression(ts, used_gb), 2) AS intercept
FROM (
    SELECT
        toUnixTimestamp(metric_time) AS ts,
        disk_used_gb                 AS used_gb
    FROM host_metrics
    WHERE host_name = 'db-01'
      AND metric_time >= now() - INTERVAL 7 DAY
);
```

### Forecasting Request Rate Trend

```sql
-- Slope of hourly request count over the past 30 days
SELECT
    service_name,
    tupleElement(
        simpleLinearRegression(
            toUnixTimestamp(hour),
            hourly_requests
        ), 1
    ) AS requests_per_second_trend
FROM (
    SELECT
        service_name,
        toStartOfHour(timestamp) AS hour,
        count()                  AS hourly_requests
    FROM request_logs
    WHERE log_date >= today() - 30
    GROUP BY service_name, hour
)
GROUP BY service_name
ORDER BY abs(requests_per_second_trend) DESC;
```

A positive slope means the service is growing; a negative slope means it is shrinking. Multiply by the number of seconds in a day to get daily trend.

## Predicting a Future Value

Given slope k and intercept b, predict y at a future time x_future as: y_pred = k * x_future + b.

```sql
-- Predict disk usage 48 hours from now for each host
SELECT
    host_name,
    k * (now_ts + 48 * 3600) + b AS predicted_disk_gb_48h
FROM (
    SELECT
        host_name,
        toUnixTimestamp(now())                                   AS now_ts,
        tupleElement(simpleLinearRegression(ts, used_gb), 1)    AS k,
        tupleElement(simpleLinearRegression(ts, used_gb), 2)    AS b
    FROM (
        SELECT
            host_name,
            toUnixTimestamp(metric_time) AS ts,
            disk_used_gb                 AS used_gb
        FROM host_metrics
        WHERE metric_time >= now() - INTERVAL 7 DAY
    )
    GROUP BY host_name
)
ORDER BY predicted_disk_gb_48h DESC;
```

## Evaluating Fit Quality with R-squared

`simpleLinearRegression()` does not return R-squared directly, but you can compute it using `corr()` - R-squared for simple linear regression equals the square of the Pearson correlation coefficient.

```sql
-- Compute slope, intercept, and R-squared for disk usage fit
SELECT
    host_name,
    tupleElement(simpleLinearRegression(ts, used_gb), 1)    AS slope,
    tupleElement(simpleLinearRegression(ts, used_gb), 2)    AS intercept,
    round(pow(corr(ts, used_gb), 2), 4)                     AS r_squared
FROM (
    SELECT
        host_name,
        toUnixTimestamp(metric_time) AS ts,
        disk_used_gb                 AS used_gb
    FROM host_metrics
    WHERE metric_time >= now() - INTERVAL 7 DAY
)
GROUP BY host_name
HAVING r_squared > 0.8  -- only hosts with a strong linear trend
ORDER BY slope DESC;
```

An R-squared above 0.8 indicates the linear model explains most of the variance in disk usage.

## Per-Group Regression

```sql
-- Fit a regression line for each service's latency trend
SELECT
    service_name,
    tupleElement(simpleLinearRegression(ts, avg_latency), 1) AS ms_per_second,
    tupleElement(simpleLinearRegression(ts, avg_latency), 2) AS base_latency_ms,
    round(pow(corr(ts, avg_latency), 2), 4)                  AS r_squared
FROM (
    SELECT
        service_name,
        toUnixTimestamp(toStartOfHour(timestamp)) AS ts,
        avg(response_time_ms)                     AS avg_latency
    FROM request_logs
    WHERE log_date >= today() - 14
    GROUP BY service_name, ts
)
GROUP BY service_name
ORDER BY ms_per_second DESC;
```

## Normalizing x for Numerical Stability

For long time ranges, raw Unix timestamps can be large numbers. Subtracting the minimum timestamp improves numerical stability.

```sql
-- Normalize x to start at 0
SELECT
    simpleLinearRegression(ts - min_ts, used_gb) AS model
FROM (
    SELECT
        disk_used_gb                  AS used_gb,
        toUnixTimestamp(metric_time)  AS ts,
        min(toUnixTimestamp(metric_time)) OVER () AS min_ts
    FROM host_metrics
    WHERE host_name = 'db-01'
      AND metric_time >= now() - INTERVAL 7 DAY
);
```

## Summary

`simpleLinearRegression(x, y)` fits an ordinary least-squares line to two numeric columns and returns the slope k and intercept b as a tuple, enabling trend forecasting and growth rate analysis entirely in SQL. It is ideal for disk capacity planning, request rate trending, and latency drift detection. Pair it with `corr()` to compute R-squared and assess fit quality, and use the slope and intercept to extrapolate predictions to any future time point.
