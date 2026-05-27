# Validation Summary: How to Use Terraform to Configure Org-Level Logging Sinks That Export to

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Audit Logs
- Organization-level aggregated log sinks
- BigQuery
- BigQuery Data Transfer Service scheduled queries
- Terraform Google provider
- SQL

## Sources Consulted
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud Logging: Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Logging: Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Logging: Understanding audit logs: https://cloud.google.com/logging/docs/audit/understanding-audit-logs
- Google Cloud Logging: SQL queries for security insights: https://cloud.google.com/logging/docs/analyze/analyze-audit-logs
- Terraform Google provider: google_logging_organization_sink: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink
- Terraform Google provider: google_bigquery_dataset: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- Terraform Google provider: google_organization_iam_audit_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_iam
- Terraform Google provider: google_bigquery_data_transfer_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_data_transfer_config
- Google BigQuery: Scheduling queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- Google BigQuery: Enable BigQuery Data Transfer Service: https://cloud.google.com/bigquery/docs/enable-transfer-service

## Issues Found
- The Cloud Logging sink filters used `logName:"cloudaudit.googleapis.com/..."`. For audit log IDs across multiple projects, folders, or organizations, the official Logging query language documents `log_id("cloudaudit.googleapis.com/...")` as the correct non-URL-encoded helper. Updated all four sink filters to use `log_id()`.
- The IAM section stated that each sink creates a unique service account. Organization-level sinks have a writer identity that must be granted destination permissions, but the identity is not necessarily unique per sink. Reworded the statement to avoid the inaccurate uniqueness claim.
- The resource deletion query used `A OR B AND timestamp...`, so SQL operator precedence applied the time filter only to the second condition. Added parentheses so the timestamp filter applies to both delete-method checks.
- The scheduled query Terraform snippet configured a service account but omitted required IAM for BigQuery Data Transfer and for the scheduler service account to run jobs, read the source dataset, and write the report dataset. Added the BigQuery Data Transfer service agent token creator binding, scheduler `roles/bigquery.jobUser`, source dataset `roles/bigquery.dataViewer`, destination dataset `roles/bigquery.dataEditor`, and explicit dependencies.

## Review Notes
The BigQuery export examples use routed-log BigQuery table names and audit-log field naming that match Cloud Logging's BigQuery export schema. Google now recommends storing logs in a log bucket upgraded for Observability Analytics with a linked BigQuery dataset for many analytics workflows, but direct BigQuery log sinks remain documented and supported.
