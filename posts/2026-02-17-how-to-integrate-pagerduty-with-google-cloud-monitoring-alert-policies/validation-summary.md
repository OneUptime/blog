# Validation Summary: How to Integrate PagerDuty with Google Cloud Monitoring Alert Policies

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Google Cloud Monitoring alert policies
- Google Cloud Monitoring notification channels
- PagerDuty Events API v1 integration
- Google Cloud CLI
- Cloud Monitoring REST API
- Terraform Google provider
- Monitoring Query Language (MQL)

## Sources Consulted
- Google Cloud Monitoring notification channels documentation: https://cloud.google.com/monitoring/support/notification-options
- Google Cloud Monitoring notification channels API guide: https://cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud SDK reference for `gcloud beta monitoring channels`: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring AlertPolicy REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring metric-based alerting behavior: https://cloud.google.com/monitoring/alerts/concepts-indepth
- Google Cloud Load Balancing metrics reference: https://cloud.google.com/load-balancing/docs/metrics
- Terraform Google provider `google_monitoring_notification_channel` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Google Cloud MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- PagerDuty services and integrations documentation: https://support.pagerduty.com/main/docs/services-and-integrations

## Issues Found
- The PagerDuty service setup said to select "Google Cloud Monitoring" as the PagerDuty integration type. Google Cloud's PagerDuty setup currently directs users to create an Events API v1 integration, so the step and conclusion were updated.
- The notification channel examples used `gcloud monitoring channels`, but Google Cloud's documented notification-channel CLI group is `gcloud beta monitoring channels`. The channel create and list commands were updated.
- The post used `gcloud monitoring channels verify CHANNEL_ID`, which is not a documented command in the `gcloud beta monitoring channels` group. The example now uses `describe` to inspect the channel and tells readers to use the Console's Send test notification option for a real test notification.
- The "High Error Rate" alert example described a percentage error-rate alert, but the policy actually measured the rate of 5xx requests per second. The display names and documentation text were updated to match the metric and threshold.
- The metric alert example used `alertStrategy.notificationRateLimit`, which is required for log-based alerting policies and not implemented for non-log-based policies. That field was removed from the metric alert example.
- The Terraform PagerDuty notification channels put `service_key` in both `labels` and `sensitive_labels`. The Terraform provider documents PagerDuty `service_key` under `sensitive_labels`, so the duplicate plain label entries were removed.
- The Terraform uptime alert counted failed uptime checks with `REDUCE_COUNT_FALSE` but used `COMPARISON_LT` and threshold `1`, which would alert when there were no failures. The comparison was changed to `COMPARISON_GT` with threshold `0`.
- The Auto-Resolution section described `autoClose` as recovery timing. Cloud Monitoring documents `autoClose` as the duration before closing open incidents after metric data stops arriving, so the text and JSON snippet were corrected.

## Review Notes
- MQL is no longer Google's recommended query language, and new MQL alerts can't be created in the Google Cloud console after July 22, 2025. The Terraform/API MQL example remains technically valid because Google still supports creating MQL alerting policies through the Cloud Monitoring API.
- Local verification with `gcloud` and `terraform` was not possible because neither CLI is installed in this environment; validation was performed against official documentation.
