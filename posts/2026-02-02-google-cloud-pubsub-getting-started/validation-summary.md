# Validation Summary: How to Get Started with Google Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- Google Cloud Pub/Sub
- gcloud CLI (`pubsub topics`, `pubsub subscriptions`)
- Terraform (`google_pubsub_topic`, `google_pubsub_subscription` from the Google provider)
- Python `google-cloud-pubsub` client (`PublisherClient`, `SubscriberClient`, `FlowControl`)
- Node.js `@google-cloud/pubsub` client (`PubSub`, `topic.publishMessage`, ordering keys)
- Express.js (for the push subscription HTTP handler)
- Cloud Monitoring metrics for Pub/Sub

## Sources Consulted
- Google Cloud Pub/Sub overview and concepts: https://cloud.google.com/pubsub/docs/overview
- gcloud CLI reference for `pubsub`: https://cloud.google.com/sdk/gcloud/reference/pubsub
- gcloud reference for `pubsub subscriptions describe` / `pull` / `seek`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions
- Pub/Sub Subscription REST resource (fields list): https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Python client docs (`google-cloud-pubsub`): https://cloud.google.com/python/docs/reference/pubsub/latest
- Node.js client docs (`@google-cloud/pubsub`): https://cloud.google.com/nodejs/docs/reference/pubsub/latest
- Push subscription message format: https://cloud.google.com/pubsub/docs/push
- Terraform Google provider for Pub/Sub: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Cloud Monitoring Pub/Sub metrics list: https://cloud.google.com/monitoring/api/metrics_gcp#gcp-pubsub

## Issues Found

**1. `gcloud pubsub subscriptions describe ... --format="value(numUndeliveredMessages)"` does not work.**

- What was wrong: The `subscriptions describe` command returns the Pub/Sub Subscription resource, whose fields are configuration-only (e.g., `ackDeadlineSeconds`, `messageRetentionDuration`, `pushConfig`, `deadLetterPolicy`, `retryPolicy`, `state`, etc.). `numUndeliveredMessages` is not a field on the Subscription resource — it is a runtime backlog metric only available through Cloud Monitoring (`pubsub.googleapis.com/subscription/num_undelivered_messages`). Running the command as written would return an empty value. The post is internally inconsistent too, since the next section correctly identifies this as a Cloud Monitoring metric.
- What was changed: Replaced the broken one-liner with a plain `gcloud pubsub subscriptions describe orders-subscription` that returns the subscription configuration, and added a short note pointing the reader to the Cloud Monitoring section below for backlog size. Also relabeled the final `topics describe` comment from "View topic metrics" to "View topic configuration" so it accurately reflects what `topics describe` returns.

## Review Notes

- Python publisher pattern (`publisher.publish(topic_path, data, **attributes)` returning a future) is correct for current versions of `google-cloud-pubsub` (v2.x+). One caveat the post doesn't call out: attribute keys that collide with publish() parameter names (`ordering_key`, `retry`, `timeout`) would be intercepted as parameters. Not a bug in the post, just a sharp edge worth knowing.
- Node.js publisher (`topic.publishMessage({ data, attributes, orderingKey })` returning `Promise<string>` with the messageId), batching options (`maxMessages`, `maxMilliseconds`), and `enableMessageOrdering` topic option are all correct for `@google-cloud/pubsub` v3.x/v4.x.
- For end-to-end message ordering, the subscription side also needs `enable_message_ordering = true`. The post only shows the publisher side; it's not wrong, just incomplete. Worth a small follow-up if expanded.
- Dead-letter policies in Pub/Sub require the Pub/Sub service account to have `pubsub.publisher` on the dead-letter topic and `pubsub.subscriber` on the original subscription. The post doesn't mention this and DLQ delivery silently won't work without it — a useful addition for a future revision.
- `--auto-ack=false` on `subscriptions pull` works (boolean gcloud flags accept `=false`), though it's redundant since false is the default. Left as-is.
- `message_retention_duration = "604800s"` (7 days) is valid; the current max for subscriptions is 7 days by default but can be extended up to 31 days via request — leaving the post's choice intact since 7 days is the common production setting.
- Push message format described in the JSDoc comment matches the actual Pub/Sub push envelope.
- The post mentions "verify the JWT token" for production push handlers but doesn't show how. For a getting-started guide that's fine, but a security-focused follow-up should demonstrate verifying the `Authorization: Bearer <jwt>` header with Google's public keys.
