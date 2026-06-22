# Validation Summary: How to Configure Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud CLI (`gcloud`)
- Pub/Sub topics and subscriptions
- Pub/Sub dead-letter topics
- Pub/Sub subscription filters
- Pub/Sub schemas with Avro
- Cloud Monitoring alerting and metrics
- Terraform Google provider
- Python `google-cloud-pubsub` client library

## Sources Consulted
- Google Cloud CLI reference: `gcloud pubsub topics create` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud CLI reference: `gcloud pubsub subscriptions create` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud CLI reference: `gcloud pubsub subscriptions update` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud CLI reference: `gcloud pubsub schemas create` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/create
- Google Cloud CLI reference: `gcloud pubsub topics publish` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- Google Cloud CLI reference: `gcloud alpha monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Pub/Sub exactly-once delivery documentation - https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery
- Pub/Sub dead-letter topics documentation - https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Pub/Sub monitoring documentation - https://docs.cloud.google.com/pubsub/docs/monitoring
- Cloud Monitoring Pub/Sub metrics list - https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#pubsub
- Cloud Monitoring `projects.timeSeries.list` API - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Python Pub/Sub `Message` client reference - https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Terraform Google provider `google_pubsub_subscription` documentation - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The topic creation section reused `orders-topic` for both the basic topic and retained-message topic examples. Changed the retained-message example to `orders-retained-topic` so the command does not fail because the topic already exists.
- The exactly-once section described the feature as subscription deduplication. Updated the wording and diagram to reflect Pub/Sub's documented guarantee: no redelivery after a successful acknowledgment, and possible redelivery if acknowledgment fails.
- The message filtering examples used `--filter`, but the current `gcloud pubsub subscriptions create` flag is `--message-filter`. Updated both commands.
- The schema CLI example used uppercase `AVRO` and `JSON` values. Updated the `gcloud` commands to use documented lowercase values: `--type=avro` and `--message-encoding=json`.
- The metrics list command used an exact metric type filter that would not list Pub/Sub metrics. Updated it to use `starts_with("pubsub.googleapis.com")`.
- The alerting policy command used non-existent `--condition-threshold-*` flags. Updated it to the documented `--if` and `--duration` flags for `gcloud alpha monitoring policies create`.
- The Terraform example configured a dead-letter policy but omitted the Pub/Sub service account IAM bindings required for forwarding dead-letter messages. Added `google_project` data and topic/subscription IAM members.
- The testing section tried to read `numUndeliveredMessages` from `gcloud pubsub subscriptions describe`, but backlog is a Cloud Monitoring metric, not a subscription resource field. Replaced it with a Monitoring API `timeSeries` query.

## Review Notes
The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform validation was performed against current official documentation rather than by executing those tools locally.
