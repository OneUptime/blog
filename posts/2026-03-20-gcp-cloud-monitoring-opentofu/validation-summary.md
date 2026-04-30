# Validation Summary: How to Set Up GCP Cloud Monitoring with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- HashiCorp Google provider
- Google Cloud Monitoring
- Google Cloud alerting policies
- Google Cloud notification channels
- Google Cloud uptime checks
- Cloud Run
- Compute Engine

## Sources Consulted
- HashiCorp Google provider registry API: https://registry.terraform.io/v1/providers/hashicorp/google
- HashiCorp Google provider docs for `google_monitoring_notification_channel`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_notification_channel.html.markdown
- HashiCorp Google provider docs for `google_monitoring_alert_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_alert_policy.html.markdown
- HashiCorp Google provider docs for `google_monitoring_uptime_check_config`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_uptime_check_config.html.markdown
- Google Cloud Monitoring notification channel docs: https://cloud.google.com/monitoring/support/notification-options
- Google Cloud Monitoring API docs for notification channel descriptors: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.notificationChannelDescriptors/list
- Google Cloud Monitoring uptime alerting docs: https://cloud.google.com/monitoring/uptime-checks/uptime-alerting-policies
- Google Cloud Monitoring sample alert policies in JSON: https://docs.cloud.google.com/monitoring/alerts/policies-in-json
- Google Cloud Monitoring resource types: https://docs.cloud.google.com/monitoring/api/resources
- Cloud Run monitoring docs: https://cloud.google.com/run/docs/monitoring
- Google Cloud Observability latency SLI docs for Cloud Run request latencies: https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud Monitoring distribution metrics docs: https://docs.cloud.google.com/monitoring/api/v3/distribution-metrics

## Issues Found
- The provider version pin was outdated. I updated `hashicorp/google` from `~> 5.10` to `~> 7.30` to match the current provider family as of April 30, 2026.
- The PagerDuty notification channel configured `service_key` in both `labels` and `sensitive_labels`. The provider documentation says credentials can't be specified in both places and that doing so causes an error, so I removed the duplicate `labels` entry.
- The Cloud Run latency alert text said it measured the 95th percentile, but the code used `ALIGN_PERCENTILE_99`. I changed the aligner to `ALIGN_PERCENTILE_95` so the implementation matches the explanation.
- The uptime alert comment implied any single failure would alert, but the condition uses `REDUCE_COUNT_FALSE` with `threshold_value = 1`, which corresponds to multiple failing checkers. I clarified the comment to match the actual alert behavior.
- The best-practices note said to use a generic GCP Console "Send Test Notification" feature. Current Google Cloud documentation says Cloud Monitoring doesn't provide a universal test option for notification channels, though Slack setup does offer a test step. I corrected the guidance to reflect that distinction.

## Review Notes
- The examples were reviewed against current provider and Google Cloud documentation, but they weren't executed locally because neither `tofu` nor `terraform` is installed in this workspace.
- On current 7.x versions of the Google provider, write-only fields like `sensitive_labels.auth_token_wo` and `sensitive_labels.service_key_wo` are available if you want to avoid storing those secrets in state. The post's `sensitive_labels` usage remains valid, but it still stores those values in raw state.
