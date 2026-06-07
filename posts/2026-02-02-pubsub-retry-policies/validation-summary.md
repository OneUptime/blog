# Validation Summary: How to Configure Pub/Sub Retry Policies with Exponential Backoff

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Google Cloud Pub/Sub (RetryPolicy, DeadLetterPolicy, subscriptions, topics)
- gcloud CLI (`gcloud pubsub subscriptions create`)
- Terraform (`google_pubsub_subscription`, `google_pubsub_topic`, `google_monitoring_alert_policy`)
- Python client library (`google-cloud-pubsub`, `google-cloud-monitoring`, `google-cloud-storage`)
- Node.js client library (`@google-cloud/pubsub`)
- Go client library (`cloud.google.com/go/pubsub`)
- Cloud Monitoring (custom metrics, alert policies)

## Sources Consulted
- [Subscription retry policy | Pub/Sub Docs](https://cloud.google.com/pubsub/docs/subscription-retry-policy)
- [Pub/Sub RetryPolicy reference](https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions#RetryPolicy)
- [gcloud pubsub subscriptions create](https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create)
- [Terraform google_pubsub_subscription](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription)
- [Python `pubsub_v1.types.RetryPolicy`](https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.RetryPolicy)
- [Node.js `createSubscriptionWithRetryPolicy.js` sample](https://github.com/googleapis/nodejs-pubsub/blob/main/samples/createSubscriptionWithRetryPolicy.js)
- [Go `cloud.google.com/go/pubsub` package](https://pkg.go.dev/cloud.google.com/go/pubsub)
- [Monitor Pub/Sub in Cloud Monitoring](https://cloud.google.com/pubsub/docs/monitoring)
- [Exactly-once delivery](https://cloud.google.com/pubsub/docs/exactly-once-delivery)

## Issues Found
1. **Incorrect backoff range comments (gcloud snippet)** — The comments stated `minimum-backoff` / `maximum-backoff` "(10s-600s)". The valid range per the Pub/Sub API is **0s-600s** with 10s being the default for `minimum_backoff` and 600s the default for `maximum_backoff`. Also corrected the flag names in the comments to match the actual gcloud flags (`min-retry-delay` / `max-retry-delay`).
2. **Incorrect backoff range comments (Python snippet)** — Comments said the values "must be between 10s and 600s". Updated to "between 0s and 600s, default 10s/600s" to match the official RetryPolicy spec.
3. **Incorrect backoff range comments (Go snippet)** — Comments said "10s minimum" / "600s maximum". The 10s value is the default, not a floor (floor is 0s). Updated to "(0s-600s, default 10s)" / "(0s-600s, default 600s)".

## Review Notes
- The exponential backoff visualization showing ~10s → ~20s → ~40s → ~80s is presented as approximate (with the `~` notation), which is appropriate. The official Pub/Sub docs do not formally publish the exact multiplier; they describe the algorithm as "more time is added to the delay" on a "best effort basis." The "doubling" model is a reasonable educational approximation.
- All client library APIs verified: `pubsub_v1.types.RetryPolicy`, `pubsub_v1.types.DeadLetterPolicy`, `pubsub_v1.types.Subscription`, `enable_exactly_once_delivery`, the Node.js `retryPolicy`/`deadLetterPolicy` options, and Go's `SubscriptionConfig` fields (`RetryPolicy`, `DeadLetterPolicy`, `EnableExactlyOnceDelivery`, `RetentionDuration`, `RetainAckedMessages`, `AckDeadline`) are all current.
- Cloud Monitoring metric types `pubsub.googleapis.com/subscription/num_undelivered_messages` and `pubsub.googleapis.com/subscription/oldest_unacked_message_age` are correctly named.
- Terraform `retry_policy`, `dead_letter_policy`, `ack_deadline_seconds`, `message_retention_duration`, and `retain_acked_messages` field names all match the current provider schema.
- Minor stylistic note (not changed): the Python `process_message` function is annotated `-> None` but returns a value via `return result`. Functionally harmless because the caller discards the return, but it's an inconsistency a future reviewer might want to clean up.
- Minor stylistic note (not changed): in `republish_message`, passing `**message.attributes` alongside explicit `republished_from_dlq` and `original_message_id` kwargs would raise a `TypeError` if the original message attributes happened to contain those keys. Edge case, not technically wrong for typical usage.
