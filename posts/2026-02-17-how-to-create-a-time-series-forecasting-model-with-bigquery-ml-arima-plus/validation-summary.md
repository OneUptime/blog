# Validation Summary: How to Create a Time Series Forecasting Model with BigQuery ML ARIMA_PLUS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery ML
- ARIMA_PLUS time series models
- GoogleSQL
- BigQuery scheduled queries

## Sources Consulted
- Google Cloud BigQuery ML: CREATE MODEL statement for ARIMA_PLUS models: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-time-series
- Google Cloud BigQuery ML: ML.FORECAST function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-forecast
- Google Cloud BigQuery ML: ML.ARIMA_EVALUATE function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-arima-evaluate
- Google Cloud BigQuery ML: ML.ARIMA_COEFFICIENTS function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-arima-coefficients
- Google Cloud BigQuery ML: ML.EXPLAIN_FORECAST function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-explain-forecast

## Issues Found
- The training example used `confidence_level=0.95` inside `CREATE MODEL`, but `CONFIDENCE_LEVEL` is an argument to `ML.FORECAST` and `ML.EXPLAIN_FORECAST`, not an ARIMA_PLUS `CREATE MODEL` option. Removed it from the model options and updated the surrounding text.
- The `auto_arima=TRUE` comment said it automatically cleans anomalies. Official docs define `AUTO_ARIMA` as automatic non-seasonal ARIMA order selection and drift handling. Updated the comment to match the option's actual behavior.
- The post described selected `prediction_interval_*` columns as confidence intervals. `ML.FORECAST` returns both prediction and confidence interval columns, and the code selected prediction intervals. Updated the wording and comments to say prediction intervals.
- The post described ARIMA_PLUS as handling trend change points. Official docs describe automatic abrupt step change detection and adjustment. Updated the wording to "abrupt step changes."
- The post said `holiday_region` automatically accounts for holidays without caveats. Official docs state holiday effect modeling applies only to daily or weekly time series longer than a year. Added that condition.
- The scheduled-query example said it retrained the model and wrote forecasts, but the SQL only wrote forecasts from an existing model. Added a `CREATE OR REPLACE MODEL` statement before writing the latest forecast table.
- The input-data description said ARIMA_PLUS expects a timestamp column. Official docs allow `TIMESTAMP`, `DATE`, or `DATETIME` for `TIME_SERIES_TIMESTAMP_COL`. Updated the wording to "time point column" and listed the supported types.

## Review Notes
The examples use current ARIMA_PLUS table-valued functions and non-deprecated model type syntax. The post intentionally uses simple placeholder project and dataset names, so the queries require users to substitute real BigQuery resources before running them.
