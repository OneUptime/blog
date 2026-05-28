# Validation Summary: How to Migrate Azure Monitor Alerts to Google Cloud Monitoring Alerting Policies

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Monitor alert rules
- Azure Monitor action groups
- Azure CLI
- Google Cloud Monitoring alerting policies
- Google Cloud Monitoring notification channels
- Cloud Logging log-based metrics and log-based alerting policies
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Azure CLI `az monitor metrics alert` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure CLI `az monitor scheduled-query` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Google Cloud CLI `gcloud beta monitoring channels create` reference: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels/create
- Google Cloud notification channels API guide: https://cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud CLI `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring AlertPolicy REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring severity enum reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/Severity
- Google Cloud Ops Agent metrics reference: https://cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud log-based alerting policies guide: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud CLI `gcloud monitoring uptime create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create

## Issues Found
- The `webhook_tokenauth` notification-channel example embedded an authentication token in the webhook URL. I changed the example to use only the webhook URL label, matching the notification-channel descriptor model where labels must match the channel descriptor.
- The direct log-based alerting policy API example omitted the required `combiner` field. I added `"combiner": "OR"`, which Google Cloud requires for log-based alerting policies.
- The uptime check example used `--regions=usa,europe,asia-pacific`, but `usa` is not a valid `gcloud monitoring uptime create` region value. I changed it to `usa-iowa,europe,asia-pacific`.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Notification-channel descriptors can vary by channel type, so in production migrations teams should verify each channel's required labels with `gcloud beta monitoring channel-descriptors describe CHANNEL_TYPE` before automating creation.
