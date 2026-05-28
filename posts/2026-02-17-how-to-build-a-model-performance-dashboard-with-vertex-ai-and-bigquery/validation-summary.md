# Validation Summary: How to Build a Model Performance Dashboard with Vertex AI and BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vertex AI
- Vertex AI request-response logging
- Vertex AI Model Monitoring
- Cloud Monitoring
- BigQuery / GoogleSQL
- Looker Studio
- Cloud Scheduler
- Python Google Cloud client libraries
- gcloud CLI

## Sources Consulted
- Vertex AI online inference logging: https://cloud.google.com/vertex-ai/docs/predictions/online-prediction-logging
- Vertex AI Model Monitoring skew and drift documentation: https://cloud.google.com/vertex-ai/docs/model-monitoring/using-model-monitoring
- Vertex AI Model Monitoring overview: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/overview
- Cloud Monitoring Google Cloud metrics list for Vertex AI: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring Python time series aggregation sample: https://docs.cloud.google.com/monitoring/docs/samples/monitoring-read-timeseries-align
- BigQuery JSON functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Looker Studio BigQuery connector documentation: https://docs.cloud.google.com/looker/docs/studio/connect-to-google-bigquery
- Cloud Scheduler `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The post described dashboard views as materialized views but used `CREATE OR REPLACE VIEW`. Changed the wording to "views" to match the SQL.
- The ground truth table used `request_id STRING`, but Vertex AI request-response logging documents `request_id` as `NUMERIC`. Updated the schema.
- The prediction log queries referenced non-existent `status_code`, `latency_ms`, `request`, and `response` columns. Updated the examples to use documented request-response log fields (`request_payload` and `response_payload`) and added an `infrastructure_metrics` table for Cloud Monitoring exports.
- The latency metric name `response_latencies` was incorrect for Vertex AI online prediction metrics. Updated it to `prediction_latencies` and used Cloud Monitoring aggregation aligners for p50, p95, and p99 values.
- The post calculated error rate from prediction logs, but Vertex AI request-response logs do not include HTTP status fields. Updated the hourly stats view to calculate prediction count, error count, and latency from exported Cloud Monitoring metrics.
- The BigQuery examples used deprecated `JSON_EXTRACT_SCALAR`. Replaced it with `JSON_VALUE`.
- The precision query actually computed recall-like values and did not insert recall metrics despite the comment. Reworked it to compute both precision and recall per class using true positives, predicted counts, and actual counts.
- The Python metrics example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(timezone.utc)`.
- Removed trailing commas from SQL DDL and SELECT lists where they could cause portability or parsing issues.

## Review Notes
The tutorial remains a simplified implementation. In a production setup, teams should also account for IAM permissions, dataset region choices, request payload shape differences across model types, and the limitations when using request-response logging together with Model Monitoring v1.
