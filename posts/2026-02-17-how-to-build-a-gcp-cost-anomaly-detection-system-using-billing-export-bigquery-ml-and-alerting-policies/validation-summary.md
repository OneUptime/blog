# Validation Summary: How to Build a GCP Cost Anomaly Detection System Using Billing Export BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Billing export
- BigQuery
- BigQuery scheduled queries
- BigQuery ML ARIMA_PLUS
- Cloud Monitoring custom metrics
- Cloud Monitoring alerting policies
- Google Cloud CLI and bq CLI
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Billing export setup documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud Billing BigQuery table documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- BigQuery ML CREATE MODEL for ARIMA_PLUS documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-time-series
- BigQuery ML ML.FORECAST documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-forecast
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery bq command-line reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Cloud Monitoring custom metrics documentation: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Monitoring gcloud policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The billing export table placeholder used too few billing account ID segments and did not mention that hyphens are converted to underscores. Updated the table name examples to `gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`.
- The model was trained through yesterday while the forecast query attempted to compare recent historical actuals to future forecast rows. Updated the training window and detection query so the forecast covers the latest completed day being compared.
- The scheduled query command contained a non-runnable SQL placeholder. Updated the example to read the full anomaly detection query from `anomaly_detection.sql`.
- The Cloud Monitoring Python example used a less reliable direct mutation style for the point interval. Updated it to construct `TimeInterval` and `Point` using the documented Python client pattern.
- The alerting policy command used obsolete or incorrect threshold flags. Updated it to the current `gcloud monitoring policies create` flags with `--if='> 0.5'` and `--duration=0s`.
- The metric push script queried `CURRENT_DATE()`, which could select an incomplete billing day and no longer matched the corrected detection query. Updated it to query the latest completed day.

## Review Notes
The tutorial is technically relevant and salvageable. For production use, teams should also decide whether to include credits, taxes, and adjustments in the cost signal, because the sample uses the billing export `cost` field directly.
