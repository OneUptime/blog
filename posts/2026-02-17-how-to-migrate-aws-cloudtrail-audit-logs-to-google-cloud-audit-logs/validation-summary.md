# Validation Summary: How to Migrate AWS CloudTrail Audit Logs to Google Cloud Audit Logs

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging and Log Router sinks
- Google Cloud CLI (`gcloud`)
- BigQuery and `bq`
- Cloud Storage and `gsutil`
- AWS CloudTrail
- AWS CLI
- Google Workspace Login Audit logs

## Sources Consulted
- Google Cloud Logging: Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Logging: Understanding audit logs: https://cloud.google.com/logging/docs/audit/understanding-audit-logs
- Google Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK: `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Logging: Configure log buckets: https://cloud.google.com/logging/docs/buckets
- Google Cloud Logging: View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud Logging: Monitor logs and log-based metrics: https://cloud.google.com/logging/docs/alerting/monitoring-logs
- Google Cloud SDK: `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Logging: Google Workspace audit logs: https://cloud.google.com/logging/docs/audit/gsuite-audit-logging
- Google Cloud Logging: Samples for Google Workspace Login Audit: https://cloud.google.com/logging/docs/audit/gsuite-login-samples
- BigQuery: Batch loading data and wildcard URI limitations: https://cloud.google.com/bigquery/docs/batch-loading-data
- AWS CloudTrail log file examples: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-examples.html
- AWS CloudTrail: Getting and viewing log files: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/get-and-view-cloudtrail-log-files.html

## Issues Found
- The introduction said Google Cloud Audit Logs are enabled by default for most services. Changed this to specifically say Admin Activity audit logs are enabled by default, because Data Access logs usually require explicit configuration.
- Several filters used `logName:"cloudaudit.googleapis.com/activity"` or `logName:"cloudaudit.googleapis.com/data_access"`. Changed specific log filters to `log_id(...)`, which is the documented way to match non-URL-encoded audit log IDs.
- The IAM audit configuration instructions did not explicitly warn readers to preserve the rest of the IAM policy. Added a note to preserve `bindings`, `etag`, and other policy fields.
- The CloudTrail BigQuery load example attempted to load raw CloudTrail JSON as newline-delimited JSON. CloudTrail S3 log files are gzip files with a top-level `Records` array, so the post now shows converting records to newline-delimited JSON before loading.
- The CloudTrail BigQuery load used a recursive `**` Cloud Storage wildcard, which BigQuery does not support. Replaced it with a concrete newline-delimited JSON object path.
- The alerting policy command used unsupported `gcloud monitoring policies create` flags (`--condition-threshold-value` and `--condition-threshold-comparison`). Replaced them with the current `--if='> 0'` and `--duration=60s` flags.
- The Google Workspace no-MFA example referenced `protoPayload.metadata.is_second_factor`, which does not match the documented Login Audit sample structure. Updated it to query the documented repeated metadata parameter fields and clarified it is for failed login events that report no second factor.
- The BigQuery deletion query used a case-sensitive `LIKE '%delete%'`, which can miss method names containing `Delete`. Changed it to `LOWER(... ) LIKE '%delete%'`.
- The BigQuery example referenced `protopayload_auditlog.status.code`; the documented routed audit log schema uses `protopayload_auditlog.statuscode`. Updated the field reference.

## Review Notes
Some examples still use placeholder project IDs, bucket names, organization IDs, dataset names, notification channel IDs, and principal emails. These are appropriate for a tutorial but must be replaced before use.
