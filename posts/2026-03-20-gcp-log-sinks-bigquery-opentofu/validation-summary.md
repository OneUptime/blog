# Validation Summary: How to Create GCP Log Sinks to BigQuery with OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- Google Cloud Logging
- Google BigQuery
- Google Cloud IAM and BigQuery dataset access controls
- Google Cloud Organizations

## Sources Consulted
- HashiCorp Google provider: `google_bigquery_dataset_access` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset_access
- Google Cloud Logging: View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: Collate and route organization- and folder-level logs to supported destinations: https://cloud.google.com/logging/docs/export/aggregated_sinks
- Google Cloud Logging REST API: `sinks` and `sinks.create`: https://cloud.google.com/logging/docs/reference/v2/rest/v2/sinks and https://cloud.google.com/logging/docs/reference/v2/rest/v2/sinks/create
- BigQuery: Control access to resources with IAM: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery: Query multiple tables using a wildcard table: https://cloud.google.com/bigquery/docs/querying-wildcard-tables
- BigQuery: Work with SQL stored procedures: https://cloud.google.com/bigquery/docs/procedures
- BigQuery: Create saved queries: https://cloud.google.com/bigquery/docs/work-with-saved-queries
- Looker Studio Help: rebrand from Data Studio to Looker Studio: https://support.google.com/looker-studio/answer/15400443?hl=en

## Issues Found
- The original dataset example mixed BigQuery dataset `access` entries with `google_bigquery_dataset_iam_member`, which current Google and provider docs warn can conflict. I replaced that pattern with `google_bigquery_dataset_access` resources throughout the post and added the missing `google_client_openid_userinfo` data source declaration.
- The post said `unique_writer_identity` creates a unique service account for each sink. Current Cloud Logging docs describe the writer identity as a Logging-managed writer identity and no longer support the “one unique service account per sink” explanation as written, so I corrected the comments and conclusion text.
- The “Saved BigQuery Queries” section used `google_bigquery_routine`, which creates a BigQuery routine or stored procedure, not a BigQuery Studio saved query. I renamed the section and wording to describe it correctly as a reusable BigQuery procedure.
- The original procedure queried `${dataset}.*` and assumed a generic `jsonPayload.message` field across exported log tables. That is unreliable because wildcard queries over heterogeneous log-export tables can fail on schema mismatches, and the field is not guaranteed across log types. I replaced it with a concrete audit-log procedure that queries the documented `cloudaudit_googleapis_com_activity` table and uses `protoPayload.methodName`.
- The conclusion referenced “BigQuery Data Studio,” which is an outdated product name. I updated it to Looker Studio.

## Review Notes
- Direct log sinks to BigQuery are still supported, but current Google Cloud documentation now recommends Log Analytics with a linked BigQuery dataset for many log-analysis workflows. That is a future improvement note, not a blocker for this post’s sink-based approach.
- The examples pin the Google provider to `~> 5.0`. The configuration shape reviewed here is still valid, but readers using newer provider major versions should still check provider release notes before applying in production.
- I did not run an end-to-end `tofu validate` or `terraform validate` in this workspace because neither `tofu` nor `terraform` is installed here.
