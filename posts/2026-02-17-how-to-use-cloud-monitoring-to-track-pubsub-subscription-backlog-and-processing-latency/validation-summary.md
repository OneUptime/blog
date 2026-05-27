# Validation Summary: How to Use Cloud Monitoring to Track Pub/Sub Subscription Backlog

## Status
validated

## Post Type
Tutorial / operational monitoring guide

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Monitoring
- Monitoring Query Language (MQL)
- PromQL
- gcloud CLI
- Terraform Google provider
- Cloud Monitoring alert policies

## Sources Consulted
- Google Cloud Pub/Sub metrics list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#pubsub
- Google Cloud Pub/Sub monitoring guide: https://docs.cloud.google.com/pubsub/docs/monitoring
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Pub/Sub subscription properties: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Terraform `google_monitoring_alert_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The post used `pubsub.googleapis.com/topic/send_message_operation_count` for publish message throughput. That metric is deprecated in the official Pub/Sub metrics list. I replaced it with `pubsub.googleapis.com/topic/message_sizes` and changed the MQL example to count distribution samples for individual published messages.
- The push latency alert used `thresholdValue: 10000` while describing a 10-second threshold. `subscription/push_request_latencies` is measured in microseconds, so `10000` means 10 milliseconds. I changed the threshold to `10000000`.
- The dashboard section presented MQL examples without noting the current MQL limitations. Google no longer recommends MQL for new Cloud Monitoring assets in the console and no longer allows creating new MQL charts, dashboards, or alerting policies through the console. I added a short caveat that MQL remains supported for existing assets and for assets created through the Cloud Monitoring API.

## Review Notes
The remaining Pub/Sub metric names, alert policy fields, gcloud command, Terraform resource fields, and subscription expiration statement match the consulted official documentation. The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform checks were verified against official documentation rather than local command output.
