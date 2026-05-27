# Validation Summary: How to Monitor Pub/Sub Subscription Backlog and Oldest Unacked Message Age

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Monitoring
- Google Cloud CLI
- Python Google Cloud Monitoring client
- Terraform Google provider
- Google Kubernetes Engine HorizontalPodAutoscaler

## Sources Consulted
- Google Cloud Pub/Sub monitoring documentation: https://cloud.google.com/pubsub/docs/monitoring
- Google Cloud Monitoring Pub/Sub metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring time-series retrieval documentation: https://cloud.google.com/monitoring/custom-metrics/reading-metrics
- Google Cloud SDK `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Cloud Monitoring dashboard API documentation: https://cloud.google.com/monitoring/dashboards/api-dashboard
- GKE autoscaling based on metrics documentation: https://cloud.google.com/kubernetes-engine/docs/tutorials/autoscaling-metrics
- Terraform Google provider `google_monitoring_alert_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The opening definition described backlog only as messages waiting to be processed. Google Cloud defines `subscription/num_undelivered_messages` as unacknowledged backlog messages, which can include messages currently being processed but not yet acknowledged. Updated the wording to match the metric semantics.
- The post said an increasing oldest unacked message age means something is stuck. That can also happen when subscribers are simply falling behind. Updated the statement to cover both cases.
- The `num_undelivered_messages` description said messages were published to the topic but not yet acknowledged. The metric is scoped to unacknowledged messages in the subscription. Updated the description.
- The command-line section claimed the `gcloud pubsub subscriptions describe` command checks backlog, but it only describes subscription configuration such as ack deadline and message retention. Updated the section title and wording.
- The Python example was described as using the Pub/Sub API directly, but it uses the Cloud Monitoring API. Updated the wording.

## Review Notes
The snippets are technically valid examples, but production alert policies should usually filter to specific subscriptions or use additional grouping/reduction depending on alerting intent. Pub/Sub backlog metrics are sampled every 60 seconds and may not be visible for up to 120 seconds, so they should not be treated as exact real-time counters.
