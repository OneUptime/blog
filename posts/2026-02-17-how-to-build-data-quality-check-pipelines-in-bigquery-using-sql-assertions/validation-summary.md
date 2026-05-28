# Validation Summary: How to Build Data Quality Check Pipelines in BigQuery Using SQL Assertions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL procedural language and stored procedures
- BigQuery scheduled queries
- Google Cloud CLI (`bq`, `gcloud`)
- Cloud Logging log-based metrics
- Cloud Monitoring alerting policies

## Sources Consulted
- BigQuery GoogleSQL procedural language reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery audit logs introduction: https://cloud.google.com/bigquery/docs/introduction-audit-workloads
- Cloud Logging log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics
- `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Logging notifications for log-based metrics: https://cloud.google.com/logging/docs/logs-based-metrics/charts-and-alerts

## Issues Found
- The stored procedure used `CONCAT` with an `INT64` value in the `RAISE` message. BigQuery `CONCAT` operates on string or bytes values, so `fail_count` was changed to `CAST(fail_count AS STRING)`.
- The scheduled query command used `bq query --schedule` without a destination table or target dataset. BigQuery scheduled query documentation requires `--destination_table` or `--target_dataset`; the example now uses `--target_dataset=data_quality` for the DML/procedure-call script.
- The scheduled query example ran exactly on the hour, which BigQuery documentation warns can trigger multiple times and cause duplicate DML effects. The schedule was moved from `07:00` to `07:03`.
- The freshness assertion comment said "last 24 hours" while the query uses `DATE_DIFF` on `DATE` values and fails only when the latest date is older than yesterday. The comment was corrected to match the query.
- The alerting section said to create a log-based metric but only showed `gcloud monitoring policies create` with a log filter. It now creates a Cloud Logging log-based metric first, then creates a Cloud Monitoring alert policy against `logging.googleapis.com/user/data_quality_assertion_failures`.

## Review Notes
The SQL assertion pattern, stored procedure structure, `EXECUTE IMMEDIATE ... INTO`, `RAISE USING MESSAGE`, BigQuery audit-log resource type, and Cloud Monitoring notification-channel flag usage were verified against official Google documentation. The CLI binaries were not installed locally, so CLI validation was performed against official command references.
