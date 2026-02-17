# How to Create a Time Series Forecasting Model with BigQuery ML ARIMA_PLUS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery ML, Time Series, Forecasting, ARIMA

Description: Learn how to build time series forecasting models using BigQuery ML ARIMA_PLUS to predict future trends directly in your data warehouse.

---

Time series forecasting is one of those problems that comes up constantly in production systems. You need to predict future request volumes for capacity planning, forecast revenue for budgeting, or estimate inventory needs. BigQuery ML includes ARIMA_PLUS, which is an enhanced ARIMA model that automatically handles seasonality, holiday effects, and trend changes. The best part is you can build and use these models entirely within BigQuery using SQL.

In this post, I will walk through building a time series forecasting model with ARIMA_PLUS, from preparing the input data to generating and visualizing forecasts.

## What ARIMA_PLUS Actually Does

ARIMA_PLUS is not a single algorithm but a pipeline of techniques. Under the hood, it runs automatic preprocessing that decomposes your time series, detects and handles anomalies, identifies seasonal patterns, selects the best ARIMA parameters, and fits the model. It also supports multiple time series in a single model, which is useful when you want to forecast many related metrics at once, like sales per product category.

The "PLUS" part adds holiday effects, spike and dip detection, and trend change point detection on top of standard ARIMA. For most business forecasting tasks, this gives you production-quality forecasts without tuning.

## Preparing Your Time Series Data

ARIMA_PLUS expects data with a timestamp column and a numeric value column. Each row represents one observation at one point in time. The data should be at a consistent granularity - daily, hourly, weekly, etc.

Here is an example of preparing daily website traffic data for forecasting.

```sql
-- Aggregate raw pageview events into a daily time series
CREATE OR REPLACE TABLE `my_project.forecasting.daily_traffic` AS
SELECT
  -- Truncate timestamps to daily granularity
  DATE(event_timestamp) AS date,
  -- Count total pageviews per day
  COUNT(*) AS daily_pageviews
FROM
  `my_project.analytics.pageview_events`
WHERE
  -- Use at least 2 years of history for good seasonality detection
  event_timestamp >= '2024-01-01'
GROUP BY
  date
ORDER BY
  date;
```

A few guidelines for the input data. You want at least two full seasonal cycles for ARIMA_PLUS to detect patterns reliably. For daily data with weekly seasonality, that means at least two weeks, but a year or more is better for capturing annual patterns. Missing dates should be handled - ARIMA_PLUS can deal with some gaps, but large gaps will hurt forecast quality.

## Training the Forecasting Model

Creating an ARIMA_PLUS model is a single CREATE MODEL statement. You specify the time series column, the data column, and optionally the forecast horizon and confidence level.

This query trains an ARIMA_PLUS model on daily pageview data with a 30-day forecast horizon.

```sql
-- Train an ARIMA_PLUS model on daily pageview data
CREATE OR REPLACE MODEL `my_project.forecasting.traffic_forecast_model`
OPTIONS(
  model_type='ARIMA_PLUS',
  -- The column containing timestamps
  time_series_timestamp_col='date',
  -- The column containing the values to forecast
  time_series_data_col='daily_pageviews',
  -- How far ahead to forecast (30 days)
  horizon=30,
  -- Automatically clean up anomalies in historical data
  auto_arima=TRUE,
  -- Detect holiday effects (uses the region's holidays)
  holiday_region='US',
  -- Set confidence interval width
  confidence_level=0.95
) AS
SELECT
  date,
  daily_pageviews
FROM
  `my_project.forecasting.daily_traffic`;
```

The `holiday_region` parameter is worth calling out. When you set this, ARIMA_PLUS automatically accounts for holidays like Thanksgiving, Christmas, and July 4th that might cause spikes or dips in your data. This can significantly improve forecast accuracy for metrics that are affected by holidays.

## Inspecting the Model

After training, you can inspect what ARIMA_PLUS detected in your data. The model coefficients tell you about the identified ARIMA parameters.

```sql
-- View the ARIMA model coefficients and parameters
SELECT
  *
FROM
  ML.ARIMA_COEFFICIENTS(MODEL `my_project.forecasting.traffic_forecast_model`);
```

You can also examine the evaluation metrics to understand model fit.

```sql
-- Evaluate the forecasting model
SELECT
  *
FROM
  ML.ARIMA_EVALUATE(MODEL `my_project.forecasting.traffic_forecast_model`);
```

This returns metrics like AIC (Akaike Information Criterion), variance, log_likelihood, and seasonal periods detected. A lower AIC generally indicates a better model. The seasonal periods field tells you what patterns ARIMA_PLUS found, such as a 7-day weekly cycle.

## Generating Forecasts

To generate predictions, use the ML.FORECAST function. This returns predicted values along with confidence intervals.

```sql
-- Generate a 30-day forecast with confidence intervals
SELECT
  forecast_timestamp,
  -- The predicted value
  forecast_value,
  -- Lower and upper bounds of the 95% confidence interval
  prediction_interval_lower_bound,
  prediction_interval_upper_bound
FROM
  ML.FORECAST(MODEL `my_project.forecasting.traffic_forecast_model`,
    STRUCT(30 AS horizon, 0.95 AS confidence_level))
ORDER BY
  forecast_timestamp;
```

The confidence intervals are crucial for practical use. Instead of planning for a single point estimate, you can use the upper bound for capacity planning (to make sure you have enough resources) and the lower bound for revenue forecasting (to set conservative targets).

## Forecasting Multiple Time Series

One of the most powerful features of ARIMA_PLUS is its ability to forecast multiple time series simultaneously. If you have pageviews broken down by product category, you can forecast all categories in a single model.

```sql
-- Train a multi-series model that forecasts traffic per product category
CREATE OR REPLACE MODEL `my_project.forecasting.traffic_by_category_model`
OPTIONS(
  model_type='ARIMA_PLUS',
  time_series_timestamp_col='date',
  time_series_data_col='daily_pageviews',
  -- This column identifies each individual time series
  time_series_id_col='product_category',
  horizon=30,
  auto_arima=TRUE,
  holiday_region='US'
) AS
SELECT
  date,
  product_category,
  daily_pageviews
FROM
  `my_project.forecasting.daily_traffic_by_category`;
```

When you call ML.FORECAST on this model, it returns forecasts for every product category, each with its own set of ARIMA parameters tuned to that category's specific patterns.

## Decomposing the Time Series

Understanding what your model sees in the data is often as valuable as the forecast itself. ARIMA_PLUS can decompose the time series into its components.

```sql
-- Decompose the time series into trend, seasonal, and residual components
SELECT
  *
FROM
  ML.EXPLAIN_FORECAST(MODEL `my_project.forecasting.traffic_forecast_model`,
    STRUCT(30 AS horizon, 0.95 AS confidence_level));
```

The output includes the trend component (the long-term direction), seasonal component (recurring patterns), holiday effect (impact of detected holidays), spike and dip effect (one-time anomalies), and the residual (what is left after removing all detected patterns). This decomposition helps you understand your data better and can reveal insights that are not obvious from looking at the raw time series.

## Practical Tips for Better Forecasts

There are several things you can do to improve forecast quality. First, data quality matters more than model complexity. Check for duplicate entries, missing days, and outliers before training. Second, longer history generally helps, especially if your data has annual seasonality. Third, choose the right granularity for your use case - daily data works well for operational forecasting, but weekly or monthly aggregations might be better for strategic planning because they smooth out noise.

If your forecasts look off, the first thing to check is whether the historical data has any major irregularities. Events like a site outage or a viral marketing campaign can throw off the model if ARIMA_PLUS does not detect them as anomalies. You can always preprocess your data to handle these before training.

## Scheduling Forecasts

For production use, you probably want forecasts regenerated on a regular schedule. You can set up a BigQuery scheduled query that retrains the model and writes predictions to a table.

```sql
-- Scheduled query: Retrain model and write fresh forecasts to a table
CREATE OR REPLACE TABLE `my_project.forecasting.latest_forecast` AS
SELECT
  forecast_timestamp,
  forecast_value,
  prediction_interval_lower_bound,
  prediction_interval_upper_bound,
  CURRENT_TIMESTAMP() AS generated_at
FROM
  ML.FORECAST(MODEL `my_project.forecasting.traffic_forecast_model`,
    STRUCT(30 AS horizon, 0.95 AS confidence_level));
```

Downstream dashboards and alerting systems can then read from this table to get the most recent forecast without re-running the prediction query.

## Wrapping Up

BigQuery ML ARIMA_PLUS takes a lot of the pain out of time series forecasting. The automatic parameter tuning, holiday detection, and anomaly handling mean you can get reasonable forecasts with minimal configuration. For most business forecasting needs - capacity planning, demand prediction, budget forecasting - this is a solid choice that keeps everything inside your existing BigQuery workflow.
