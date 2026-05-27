# Validation Summary: Set Up Cross-Project Audit Log Aggregation with Organization-Level Log Sinks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Audit Logs
- Organization-level aggregated log sinks
- BigQuery log export
- Cloud Storage log export
- Pub/Sub log export
- Cloud Monitoring log-based alerting
- gcloud CLI
- bq CLI

## Sources Consulted
- Google Cloud Logging aggregated sinks documentation: https://cloud.google.com/logging/docs/export/aggregated_sinks
- gcloud logging sinks create reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging query language documentation: https://cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging BigQuery export documentation: https://cloud.google.com/logging/docs/export/bigquery
- Cloud Audit Logs documentation: https://cloud.google.com/logging/docs/audit/understanding-audit-logs
- Enable Data Access audit logs documentation: https://cloud.google.com/logging/docs/audit/configure-data-access
- Cloud Logging log-based alerting policy documentation: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- gcloud Pub/Sub subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create

## Issues Found
- The `gcloud logging sinks create` examples used `--destination`, but the current gcloud syntax expects `DESTINATION` as a positional argument after the sink name. Updated all sink creation commands accordingly.
- The Cloud Storage bucket was created with a dynamic date suffix, but later examples used the hardcoded bucket name `org-audit-archive-20260217`. Added an `AUDIT_BUCKET` variable and reused it in sink creation, IAM binding, and verification commands.
- The audit log filters used raw `logName` substring matching with unencoded slash values. Updated the filters to use the documented `log_id("cloudaudit.googleapis.com/...")` function for audit log IDs.
- The BigQuery verification and example queries used wildcard date-sharded table names while the sinks were created with `--use-partitioned-tables`. Updated the queries to use the partitioned table name and timestamp filtering.
- The Data Access volume example described creating an exclusion filter but actually updated the sink inclusion filter. Adjusted the text and comment so they match the command.
- The Step 8 `gcloud logging read` command described creating an alert, but it only reads recent entries. Updated the comment to describe what the command does.
- The Cloud Monitoring alerting command used metric-style CLI flags for a log-based alert. Replaced it with a log-based alert policy JSON using `conditionMatchedLog` and `notificationRateLimit`, then created it with `gcloud monitoring policies create --policy-from-file`.

## Review Notes
- The overall architecture is technically valid: organization-level aggregated sinks with `--include-children` can route matching child-resource logs to supported destinations, and the destination writer identity must be granted permissions on the target BigQuery dataset, Cloud Storage bucket, or Pub/Sub topic.
- Log-based alerting policies operate at project scope, so the alert policy example assumes the relevant log entries are available to the central audit project where the policy is created.
