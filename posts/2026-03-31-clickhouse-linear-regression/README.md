# How to Perform Linear Regression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Statistics, Linear Regression, Machine Learning, Analytics

Description: Learn how to perform simple and multiple linear regression in ClickHouse using built-in aggregate functions for predictive analytics at scale.

---

## Why Linear Regression in ClickHouse?

Running linear regression directly in ClickHouse eliminates the need to export data to Python or R for simple trend analysis and forecasting. ClickHouse provides native functions for both ordinary least squares and stochastic gradient descent based regression.

## Simple Linear Regression with simpleLinearRegression

For a single predictor, use `simpleLinearRegression`:

```sql
SELECT simpleLinearRegression(request_count, response_time_ms)
FROM hourly_stats
WHERE toDate(ts) >= today() - 30;
```

The result is a tuple `(slope, intercept)`. A slope of 0.5 means that for each additional request, response time increases by 0.5 ms.

## Extracting Coefficients

```sql
WITH simpleLinearRegression(request_count, response_time_ms) AS reg
SELECT
    reg.1 AS slope,
    reg.2 AS intercept
FROM hourly_stats
WHERE toDate(ts) >= today() - 30;
```

## Making Predictions

Once you have the coefficients, apply the model:

```sql
WITH
    (SELECT simpleLinearRegression(request_count, response_time_ms)
     FROM hourly_stats WHERE toDate(ts) >= today() - 30) AS reg
SELECT
    request_count,
    response_time_ms AS actual,
    reg.2 + reg.1 * request_count AS predicted
FROM hourly_stats
WHERE toDate(ts) = today()
LIMIT 20;
```

## Multiple Linear Regression with stochasticLinearRegression

For multiple features, use `stochasticLinearRegression`:

```sql
SELECT stochasticLinearRegression(0.01, 0.01, 10, 'Adam')(
    response_time_ms,
    request_count,
    cpu_usage,
    memory_usage_mb
)
FROM server_metrics
WHERE toDate(ts) >= today() - 7;
```

The parameters are: learning rate, L2 regularization, batch size, and optimizer.

## Computing R-Squared

ClickHouse does not have a built-in R-squared function, but you can compute it:

```sql
WITH
    (SELECT simpleLinearRegression(x, y) FROM regression_data) AS reg,
    (SELECT avg(y) FROM regression_data) AS mean_y
SELECT
    1 - sum(pow(y - (reg.2 + reg.1 * x), 2)) / sum(pow(y - mean_y, 2)) AS r_squared
FROM regression_data;
```

An R-squared close to 1 indicates a strong linear fit.

## Practical Use: Forecasting Request Volume

```sql
WITH reg AS (
    SELECT simpleLinearRegression(toUnixTimestamp(ts), request_count) AS coeffs
    FROM hourly_traffic
    WHERE ts >= now() - INTERVAL 7 DAY
)
SELECT
    now() + INTERVAL 1 HOUR AS forecast_time,
    reg.coeffs.2 + reg.coeffs.1 * toUnixTimestamp(now() + INTERVAL 1 HOUR) AS predicted_requests
FROM reg;
```

## Summary

ClickHouse's `simpleLinearRegression` and `stochasticLinearRegression` allow you to run regression models without leaving SQL. Use `simpleLinearRegression` for quick trend lines and single-variable prediction, and `stochasticLinearRegression` for multi-feature models. Combine with manual R-squared calculation to assess model quality.
