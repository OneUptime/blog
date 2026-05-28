# Validation Summary: How to Build an Audit Log Analysis Pipeline with BigQuery and Looker Studio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging log sinks
- BigQuery datasets, routed log tables, views, SQL, and scheduled queries
- Looker Studio
- Google Cloud CLI and bq command-line tool

## Sources Consulted
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK: gcloud logging sinks create reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Logging: View logs routed to BigQuery and audit log BigQuery schema: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud Logging: Cloud Audit Logs overview: https://cloud.google.com/logging/docs/audit
- BigQuery: bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery: Control access to resources with IAM: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery: Introduction to materialized views: https://cloud.google.com/bigquery/docs/materialized-views-intro
- BigQuery: Create materialized views: https://cloud.google.com/bigquery/docs/materialized-views-create
- Google Cloud Architecture Center: Security log analytics in Google Cloud: https://cloud.google.com/architecture/security-log-analytics

## Issues Found
- The architecture section incorrectly said Cloud Scheduler triggers the analysis queries. Changed this to BigQuery scheduled queries, matching the `bq query --schedule` example.
- The sink creation commands used `--destination`, but `gcloud logging sinks create` expects the destination as a positional argument. Updated all sink commands.
- The post used `bq add-iam-policy-binding` to grant dataset access, but the bq reference states that command does not support datasets. Replaced it with BigQuery `GRANT` DCL for the dataset.
- The post combined `--use-partitioned-tables` with date-suffixed wildcard table names and `_TABLE_SUFFIX` filters. Partitioned Cloud Logging exports remove the date suffix, so the queries now use the unsuffixed partitioned tables and timestamp filters.
- The "materialized views" were not valid BigQuery materialized views because they selected raw rows, used wildcard tables, and used non-deterministic date filters. Changed them to standard views.
- The IAM change query referenced `protopayload_auditlog.request`; routed audit logs store request payloads as `protopayload_auditlog.requestJson`. Updated the JSON extraction.
- The failed authentication query searched Admin Activity logs using a broad `%Login%` pattern. Updated it to use the Data Access login audit table pattern from Google Cloud's security log analytics examples: `login.googleapis.com` and `google.login.LoginService.loginFailure`.
- The internal IP redaction string was listed as `gce-internal`; Cloud Audit Logs documents `gce-internal-ip`. Updated the scheduled query filter.
- The post described dashboards as updating in real time. Reworded this to say they update as Looker Studio refreshes BigQuery data.

## Review Notes
Data Access audit logs can be high volume and may require explicit enablement depending on service and log type. The post's approach is technically valid, but production deployments should also define lifecycle policies, alert delivery mechanisms, and the exact services whose Data Access logs are needed.
