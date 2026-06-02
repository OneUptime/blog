# Validation Summary: How to Audit IAM Policy Changes Using Cloud Audit Logs in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Cloud Audit Logs
- Cloud Logging and Logs Explorer query language
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring alerting policies
- Logs-based metrics
- Log sinks to Cloud Storage, BigQuery, and Pub/Sub
- Python `google-cloud-logging` client library
- BigQuery SQL

## Sources Consulted
- Google Cloud IAM: Review IAM allow policy history: https://docs.cloud.google.com/iam/docs/review-iam-policy-history
- Google Cloud IAM audit logging: https://docs.cloud.google.com/iam/docs/audit-logging
- Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- `gcloud logging metrics create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- `gcloud logging sinks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Python Cloud Logging direct library usage: https://docs.cloud.google.com/python/docs/reference/logging/latest/direct-lib-usage
- Cloud Logging BigQuery export schema: https://docs.cloud.google.com/logging/docs/export/bigquery

## Issues Found
- The post said audit log entries include before and after policy details. Google Cloud IAM audit logs expose policy deltas when available, while request and response fields can omit details. Changed this to "IAM policy delta when available."
- Several general IAM policy filters used exact `protoPayload.methodName="SetIamPolicy"`, which can miss fully qualified method names such as `google.iam.admin.v1.SetIAMPolicy`. Updated broad IAM policy-change filters to use `protoPayload.methodName:SetIamPolicy`, matching Google Cloud's documented approach for IAM allow policy history.
- The Python report accepted a `days` argument but did not use it. Added a timestamp filter based on the requested number of days and removed unused imports.
- The Cloud Monitoring alert policy examples used outdated or incorrect flags (`--condition-comparison`, `--condition-threshold-value`, and `--condition-duration`). Updated them to the current `gcloud monitoring policies create` flags: `--if='> 0'` and `--duration=0s`.
- The BigQuery trend query referenced `protopayload_auditlog.serviceData` and inspected only the first binding delta. Updated it to use the routed audit-log schema field `protopayload_auditlog.servicedata_v1_iam.policyDelta.bindingDeltas`, unnest all binding deltas, and count distinct log entries.
- The BigQuery examples used exact `methodName = 'SetIamPolicy'`. Updated them to match both `SetIamPolicy` and `SetIAMPolicy` forms.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
