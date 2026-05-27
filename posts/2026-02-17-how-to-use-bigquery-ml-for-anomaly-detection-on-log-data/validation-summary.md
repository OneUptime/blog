# Validation Summary: How to Use BigQuery ML for Anomaly Detection on Log Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- BigQuery
- BigQuery ML
- ARIMA_PLUS time series models
- K-Means clustering
- GoogleSQL
- gcloud CLI

## Sources Consulted
- Google Cloud SDK: `gcloud logging sinks create` - https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging: View logs routed to BigQuery - https://cloud.google.com/logging/docs/export/bigquery
- BigQuery ML: CREATE MODEL statement for ARIMA_PLUS models - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-time-series
- BigQuery ML: ML.FORECAST function - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-forecast
- BigQuery ML: ML.EXPLAIN_FORECAST function - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-explain-forecast
- BigQuery ML: CREATE MODEL statement for K-Means models - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-kmeans
- BigQuery ML: ML.PREDICT function - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-predict
- BigQuery ML: ML.DETECT_ANOMALIES function - https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-detect-anomalies
- BigQuery GoogleSQL query syntax and alias visibility - https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax

## Issues Found
- The Cloud Logging exported field names used `json_payload` and `text_payload`, but Cloud Logging keeps LogEntry field names such as `jsonPayload` and `textPayload` in BigQuery. Updated the examples to use the exported field names.
- The latency extraction used `JSON_VALUE(json_payload, '$.latency_ms')`, which does not match the BigQuery schema for structured Cloud Logging payload fields. Updated it to `SAFE_CAST(jsonPayload.latency_ms AS FLOAT64)`.
- The ARIMA_PLUS model options included `confidence_level`, which is not a valid `CREATE MODEL` option for ARIMA_PLUS. Replaced it with `horizon=24`; confidence level is supplied to forecast functions.
- The forecast examples used `ML.EXPLAIN_FORECAST` while selecting `forecast_value` and joining on `forecast_timestamp`-style output. Updated those examples to use `ML.FORECAST`, which returns `forecast_value`, `forecast_timestamp`, and prediction interval bounds.
- The forecast examples joined on `f.time_series_id_col`, but BigQuery ML forecast output inherits the actual time series ID column name. Updated joins to use `f.service_name`.
- One anomaly query filtered on the `anomaly_status` SELECT alias in the same query's `WHERE` clause, which GoogleSQL does not allow. Wrapped the scoring query in a CTE and filtered in the outer query.
- The K-Means section used raw nearest-centroid distance from `ML.PREDICT` as the anomaly criterion. Updated it to use `ML.DETECT_ANOMALIES` with a contamination value and `normalized_distance`, matching BigQuery ML's documented K-Means anomaly detection output.

## Review Notes
- The `gcloud logging sinks create` command and flags are current, but production users must also ensure the sink writer identity has permission to write to the BigQuery dataset.
- The examples assume `jsonPayload.latency_ms` exists as a structured payload field. Logs that store latency under a different key or only in `textPayload` need an extraction query adjusted to that schema.
