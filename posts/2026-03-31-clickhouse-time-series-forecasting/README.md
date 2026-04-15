# How to Build Time-Series Forecasting Features in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Forecasting, Time-Series, Linear Regression, Analytics

Description: Learn how to build time-series forecasting features in ClickHouse using linear regression, moving averages, and trend extrapolation functions.

---

## Forecasting in the Database

Moving forecasting logic closer to the data reduces pipeline complexity. ClickHouse provides regression and statistical aggregation functions that enable simple to moderate forecasting directly in SQL, without exporting data to external tools.

## Linear Trend Extrapolation

Use `simpleLinearRegression` to fit a trend line and extrapolate forward. The function returns a `(slope, intercept)` tuple:

```sql
WITH trend AS (
    SELECT
        simpleLinearRegression(
            toUnixTimestamp(day),
            revenue
        ) AS params
    FROM (
        SELECT toDate(event_time) AS day, sum(revenue) AS revenue
        FROM sales
        WHERE event_time >= today() - 90
        GROUP BY day
    )
)
SELECT
    today() + INTERVAL number DAY AS forecast_day,
    round(params.1 * toUnixTimestamp(today() + INTERVAL number DAY) + params.2, 2) AS forecast_revenue
FROM trend, numbers(30);
```

## Moving Average Forecast

Use the last N days' average as the forecast for the next period:

```sql
WITH recent_avg AS (
    SELECT avg(revenue) AS avg_revenue
    FROM (
        SELECT toDate(event_time) AS day, sum(revenue) AS revenue
        FROM sales
        WHERE event_time >= today() - 7
        GROUP BY day
    )
)
SELECT
    today() + INTERVAL number DAY AS forecast_day,
    round(avg_revenue, 2) AS forecast_revenue
FROM recent_avg, numbers(7);
```

## Seasonality Detection

Identify weekly patterns to improve forecasts:

```sql
SELECT
    day_of_week,
    avg(daily_revenue) AS avg_revenue,
    stddevPop(daily_revenue) AS stddev
FROM (
    SELECT toDate(event_time) AS d, toDayOfWeek(event_time) AS day_of_week, sum(revenue) AS daily_revenue
    FROM sales
    WHERE event_time >= today() - 90
    GROUP BY d, day_of_week
)
GROUP BY day_of_week
ORDER BY day_of_week;
```

## Confidence Interval

Estimate forecast uncertainty using standard deviation:

```sql
SELECT
    day,
    revenue,
    avg(revenue) OVER w AS trend,
    avg(revenue) OVER w - 2 * stddevPop(revenue) OVER w AS lower_bound,
    avg(revenue) OVER w + 2 * stddevPop(revenue) OVER w AS upper_bound
FROM (
    SELECT toDate(event_time) AS day, sum(revenue) AS revenue
    FROM sales GROUP BY day ORDER BY day
)
WINDOW w AS (ORDER BY day ROWS BETWEEN 13 PRECEDING AND CURRENT ROW)
ORDER BY day;
```

## Storing Forecasts

Persist forecasts for dashboards and alerting:

```sql
CREATE TABLE revenue_forecasts
(
    forecast_date   Date,
    horizon_days    UInt8,
    forecast_value  Float64,
    lower_bound     Float64,
    upper_bound     Float64,
    model           LowCardinality(String),
    created_at      DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (forecast_date, model);
```

## Summary

ClickHouse enables in-database forecasting using `simpleLinearRegression`, moving averages, and window-based standard deviations. For seasonal workloads, compute per-day-of-week baselines. Store forecasts in a dedicated table so dashboards can overlay actuals vs. predictions. For more complex models, export features from ClickHouse and import predictions back.
