# Validation Summary: How to Configure Automated IAM Anomaly Detection and Response in Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- Cloud Audit Logs and Cloud Logging sinks
- BigQuery and GoogleSQL
- Terraform Google provider
- Cloud Functions
- Cloud Scheduler
- Pub/Sub
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Cloud Logging routed logs in BigQuery schema: https://docs.cloud.google.com/logging/docs/export/bigquery
- BigQuery timestamp functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery JSON functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Terraform `google_project_iam_audit_config` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform `google_cloud_scheduler_job` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
- Terraform Cloud Functions v2 tutorial: https://docs.cloud.google.com/functions/docs/tutorials/terraform
- Google Cloud IAM Python `DisableServiceAccountRequest` reference: https://cloud.google.com/python/docs/reference/iam/latest/google.cloud.iam_admin_v1.types.DisableServiceAccountRequest
- Google Cloud BigQuery Python `Row` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.table.Row

## Issues Found
- Replaced `JSON_EXTRACT_SCALAR` with `JSON_VALUE` in BigQuery queries because the former is deprecated in GoogleSQL.
- Replaced invalid `TIMESTAMP_TRUNC(timestamp, INTERVAL 10 MINUTE)` expressions with `TIMESTAMP_SECONDS(DIV(UNIX_SECONDS(timestamp), 600) * 600)` for 10-minute timestamp bucketing.
- Changed references to "login locations" and "failed authentication attempts" to API source locations and failed authorization attempts, which better matches the Cloud Audit Logs fields and events used by the implementation.
- Corrected the automation description from "BigQuery scheduled queries and Cloud Functions" to "Cloud Scheduler and Cloud Functions" because the post's implementation schedules an HTTP-triggered function, not a BigQuery scheduled query.
- Added a `revert_iam_change` placeholder function so the response snippet no longer calls an undefined Python function.

## Review Notes
The Terraform and Python snippets are illustrative and still omit deployment details such as function packaging, IAM permissions for the sink writer and function service accounts, Pub/Sub topic resources, and production-safe remediation logic. Those omissions are acceptable for this post, but readers would need to add them before using the pattern in production.
