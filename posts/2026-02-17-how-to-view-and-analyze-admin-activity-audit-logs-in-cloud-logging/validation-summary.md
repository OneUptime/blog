# Validation Summary: How to View and Analyze Admin Activity Audit Logs in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Audit Logs
- Cloud Logging and Logs Explorer
- Google Cloud CLI (`gcloud logging`)
- Cloud Logging query language
- Log Analytics / BigQuery SQL
- Log-based metrics and sinks

## Sources Consulted
- Google Cloud: Cloud Audit Logs overview, https://cloud.google.com/logging/docs/audit
- Google Cloud: Understanding audit logs, https://cloud.google.com/logging/docs/audit/understanding-audit-logs
- Google Cloud: Store log entries, https://cloud.google.com/logging/docs/store-log-entries
- Google Cloud: Logging query language, https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud: SQL queries for security insights, https://cloud.google.com/logging/docs/analyze/analyze-audit-logs
- Google Cloud: Query and analyze logs with Observability Analytics, https://cloud.google.com/logging/docs/analyze/query-and-view
- Google Cloud: Cloud Run audit logging, https://cloud.google.com/run/docs/audit-logging
- Google Cloud SDK: `gcloud logging read`, https://cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud SDK: `gcloud logging metrics create`, https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK: `gcloud logging sinks create`, https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Observability pricing, https://cloud.google.com/stackdriver/pricing

## Issues Found
- Resource deletion filters used lowercase-only regex patterns. Cloud Logging regular expression queries are case-sensitive, and many Google Cloud audit method names use `Delete...`. Updated the Logs Explorer, SQL, and log-based metric examples to use case-insensitive delete matching.
- IAM policy filters matched only the unqualified `SetIamPolicy` method. Some audit logs use fully qualified method names and `SetIAMPolicy` casing. Updated the filters and SQL examples to match `SetIamPolicy` and `SetIAMPolicy` suffixes.
- The IAM investigation section claimed that the log entry includes both the old and new policy. Google Cloud audit entries include the request and may include service-specific policy delta details, but a full before-and-after policy is not guaranteed for every entry. Reworded this claim.
- The Cloud Run deployment filter only matched `ReplaceService`, but current Cloud Run audit logs can use `CreateService`, `ReplaceService`, or `UpdateService` depending on API version and action. Expanded the filter and narrowed the surrounding sentence to Cloud Run.

## Review Notes
The core claims about Admin Activity audit logs being always written, stored in the `_Required` bucket, retained for 400 days, and available through Logs Explorer, `gcloud logging read`, Log Analytics, metrics, and sinks are consistent with current Google Cloud documentation. The local environment did not have `gcloud` installed, so CLI syntax was verified against official Google Cloud SDK reference pages rather than local `--help` output.
