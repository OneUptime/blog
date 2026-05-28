# Validation Summary: How to Create Log Sinks to Export Logs to BigQuery in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging log sinks and Log Router
- BigQuery datasets and SQL queries
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- Terraform Google provider
- Looker Studio

## Sources Consulted
- Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Cloud Logging: View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging log bucket retention: https://cloud.google.com/logging/docs/store-log-entries
- Google Cloud SDK: `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK: `gcloud logging sinks update`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery IAM access control: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Terraform Google provider: `google_logging_project_sink`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink
- Terraform Google provider: `google_bigquery_dataset_iam_member`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset_iam

## Issues Found
- The retention bullet incorrectly associated 400-day retention with the `_Default` bucket. Updated it to distinguish `_Default` 30-day default retention from `_Required` 400-day retention for required audit logs.
- The dataset-level IAM example used `bq add-iam-policy-binding`, but the official `bq` reference says that command doesn't support datasets. Replaced it with a BigQuery DCL `GRANT` statement on the dataset schema.
- The post said Cloud Logging creates one table per log type per day and that table names follow a `resource_type_logname` pattern. Official Cloud Logging documentation says routed BigQuery table names are based on log names and timestamps. Updated the explanation and examples accordingly.
- The Cloud Run query examples referenced `cloud_run_revision_*`, which is a monitored resource type, not the BigQuery table naming pattern for routed logs. Updated the examples to use `run_googleapis_com_*` and `run_googleapis_com_requests`.
- The schema table listed `jsonPayload` as `JSON`. Routed Cloud Logging structured payloads are exported as BigQuery nested records based on the log entry schema. Updated the type to `RECORD`.
- One BigQuery query used `severity >= 'ERROR'`, which is a string comparison in BigQuery, not Cloud Logging severity ordering. Replaced it with `severity IN ('ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY')`.
- The Terraform sink example used `bigquery_options` but did not explicitly set `unique_writer_identity = true`. The Terraform provider documentation says this is required when using `bigquery_options`; added the setting.
- Removed the outdated "Data Studio" name from the dashboard bullet and kept Looker Studio.

## Review Notes
- The direct Cloud Logging sink to BigQuery workflow is still supported, but Google Cloud documentation notes that Log Analytics with linked BigQuery datasets is now the recommended approach for many analysis use cases.
- The project-level `roles/bigquery.dataEditor` command is valid but broader than necessary; the dataset-level grant shown in the post is better for least privilege.
