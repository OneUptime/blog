# Validation Summary: How to Set Up GCP Audit Logging with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Google provider
- Google Cloud Audit Logs
- Cloud Logging
- Cloud Monitoring
- Cloud Storage
- HCL

## Sources Consulted
- Google Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Cloud Storage audit logging: https://docs.cloud.google.com/storage/docs/audit-logging
- Bucket Lock and retention policies: https://cloud.google.com/storage/docs/bucket-lock
- Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Configure notifications for log-based metrics: https://cloud.google.com/logging/docs/logs-based-metrics/charts-and-alerts
- Log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics/
- IAM audit logging: https://cloud.google.com/iam/docs/audit-logging
- Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google provider project IAM docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_iam.html.markdown
- Google provider organization IAM docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_organization_iam.html.markdown
- Google provider logging project sink docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_project_sink.html.markdown
- Google provider storage bucket docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
- Google provider logging metric docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_metric.html.markdown
- Google provider monitoring alert policy docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_alert_policy.html.markdown
- Google provider monitoring notification channel docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_notification_channel.html.markdown

## Issues Found
- The introduction stated that Data Access logs must always be explicitly enabled. Google documents that BigQuery Data Access audit logs are enabled by default, while most other services require explicit enablement. I corrected the introduction and conclusion, and clarified the BigQuery example.
- The `ADMIN_READ` comment in the `google_project_iam_audit_config` example described it as generic "admin reads". In Google Cloud audit logging, `ADMIN_READ` is a permission type for reads of configuration or metadata. I corrected the comment to match the IAM audit config semantics.
- The BigQuery service-level example omitted `ADMIN_READ`, even though Google documents that some BigQuery services, such as Reservations, require `ADMIN_READ` audit logging to be enabled. I added that block and adjusted the surrounding wording.
- The log-based metric filter matched only `protoPayload.methodName="SetIamPolicy"` and didn't explicitly scope to Admin Activity audit logs. I updated it to use `log_id("cloudaudit.googleapis.com/activity")` and a `protoPayload.methodName:"SetIamPolicy"` match so it aligns with Google audit log filtering guidance.
- The alert policy used `ALIGN_COUNT`, which counts the number of samples in an alignment period, not the sum of counter values. For a logs-based counter metric, that can misrepresent IAM policy change counts. I changed it to `ALIGN_SUM`, which matches Cloud Monitoring's documented aligner behavior for DELTA numeric metrics.
- The alert policy referenced `google_monitoring_notification_channel.email.name`, but the notification channel resource wasn't defined. I added a valid `google_monitoring_notification_channel` example so the snippet is internally consistent.

## Review Notes
- The post pins the Google provider to `~> 5.0`. Current provider documentation is on the 7.x line, but the resources and arguments used in this post remain valid in current docs.
- Email notification channels typically require verification before they deliver alert notifications. The Terraform configuration is valid, but delivery depends on completing that verification step in Google Cloud.
