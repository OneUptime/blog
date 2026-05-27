# Validation Summary: Monitor and Audit Authentication Events Across a Google Cloud Organization

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging aggregated sinks
- BigQuery log exports
- Google Workspace Admin SDK Reports API
- IAM and Service Account Credentials audit logs
- Cloud Functions
- Pub/Sub
- Firestore
- Python
- SQL

## Sources Consulted
- Google Cloud: Enable Data Access audit logs - https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud SDK: gcloud logging sinks create - https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud: View logs routed to BigQuery - https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud: Audit logs for Google Workspace - https://cloud.google.com/logging/docs/audit/gsuite-audit-logging
- Google Cloud: Samples for Google Workspace Login Audit - https://cloud.google.com/logging/docs/audit/gsuite-login-samples
- Google Workspace Admin SDK Reports API: activities.list - https://developers.google.com/workspace/admin/reports/reference/rest/v1/activities/list
- Google Workspace Admin SDK Reports API: Login Audit Activity Events - https://developers.google.com/workspace/admin/reports/v1/appendix/activity/login
- Google Cloud IAM: Identity and Access Management audit logging - https://cloud.google.com/iam/docs/audit-logging
- Google Cloud IAM: Service Account Credentials audit logging - https://cloud.google.com/iam/docs/audit-logging/audit-logging-iamcreds

## Issues Found
- The `gcloud logging sinks create` command used `--destination`, but the Google Cloud CLI expects the sink destination as a positional argument. Updated the command to place the BigQuery destination immediately after the sink name.
- The sink filter used fully qualified method names for Service Account Credentials API methods. Official IAM Credentials audit logging filters use `GenerateAccessToken` and `SignBlob`, so the filter was updated.
- The sink filter matched Admin Activity logs with `logName:"cloudaudit.googleapis.com/activity"`, which is unreliable because log IDs are URL-encoded in `logName`. Updated it to use `log_id("cloudaudit.googleapis.com/activity")`.
- The post stated that all listed authentication events generate audit log entries. Updated this to say many generate Cloud Audit Logs or Admin SDK Reports API events, which is more accurate for Google Workspace and related authentication event sources.
- The Google Workspace section stated that login events are separate from GCP audit logs. Updated it to clarify that Workspace login events can be shared with Google Cloud Audit Logs, while the Admin SDK Reports API is needed when that sharing is not enabled.
- The SQL examples queried date-sharded BigQuery export tables with `_TABLE_SUFFIX`, but the sink command creates partitioned tables with `--use-partitioned-tables`. Updated the queries to use partitioned table names and timestamp filters.
- The BigQuery compliance query used `protopayload_auditlog.status.code`, but routed audit logs expose the status code as `protopayload_auditlog.statuscode`. Updated the field and treated missing status codes as successful events.
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python versions. Updated the examples to use timezone-aware `datetime.now(timezone.utc)`.
- The real-time alerting Python snippet referenced `datetime`, `calculate_time_diff`, `geoip_lookup`, and `send_alert` without defining or importing them. Added the missing import and minimal helper implementations so the snippet is syntactically complete.

## Review Notes
The examples are now technically aligned with current Google documentation, but they still require environment-specific setup: BigQuery tables and schemas must exist before `insert_rows_json` calls, Google Workspace domain-wide delegation must be configured for the Reports API service account, and the GeoIP and alert helpers should be replaced with production providers.
