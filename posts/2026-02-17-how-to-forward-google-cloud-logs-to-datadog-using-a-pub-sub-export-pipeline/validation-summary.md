# Validation Summary: How to Forward Google Cloud Logs to Datadog Using a Pub/Sub Export Pipeline

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging sinks and exclusions
- Google Cloud Pub/Sub topics, push subscriptions, retry policies, and dead-letter topics
- Datadog Google Cloud log intake
- Google Cloud Monitoring alert policies
- Terraform Google provider resources

## Sources Consulted
- Datadog: Collect Google Cloud Logs with a Pub/Sub Push Subscription: https://docs.datadoghq.com/logs/guide/collect-google-cloud-logs-with-push/
- Datadog: Google Cloud Platform integration log collection: https://docs.datadoghq.com/integrations/google_cloud_platform/
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: View logs routed to Pub/Sub: https://cloud.google.com/logging/docs/export/pubsub
- Google Cloud SDK: gcloud pubsub subscriptions create: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK: gcloud pubsub subscriptions update: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub: Dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub: Monitor Pub/Sub in Cloud Monitoring: https://cloud.google.com/pubsub/docs/monitoring
- Google Cloud Monitoring metrics list for Pub/Sub metrics: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK: gcloud logging sinks create/update: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create and https://cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- Terraform Google provider: google_pubsub_subscription: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The introduction described the Pub/Sub Push method as the recommended approach. Datadog's current documentation marks Pub/Sub Push as deprecated/legacy and recommends a pull subscription with the Datadog Dataflow template for new deployments. Updated the wording to describe the push method as a direct legacy-compatible approach and note the current Datadog recommendation.
- The initial `gcloud pubsub subscriptions create` command used `--max-delivery-attempts` without configuring a dead-letter topic. Google Cloud CLI requires a dead-letter topic when dead-letter options are used. Removed that flag from the initial subscription creation and kept it in the later dead-letter update command.
- The dead-letter setup omitted the required IAM grants for the Pub/Sub service agent. Added `roles/pubsub.publisher` on the dead-letter topic and `roles/pubsub.subscriber` on the source subscription, plus equivalent Terraform IAM resources.
- The dead-letter alert used the deprecated `pubsub.googleapis.com/topic/send_message_operation_count` metric. Replaced it with `pubsub.googleapis.com/subscription/dead_letter_message_count`, which directly tracks messages forwarded to the dead-letter topic.
- The cost optimization section showed an invalid `gcloud logging sinks create ... --exclusion` command without a sink destination. Replaced it with `gcloud logging sinks update _Default --add-exclusion=...`, which matches the supported Cloud Logging sink exclusion syntax.

## Review Notes
The Pub/Sub Push intake URL format is still documented by Datadog for legacy setups, but new production deployments should prefer Datadog's Dataflow-based pull subscription method because Pub/Sub Push lacks batching/compression and is being deprecated by Datadog.
