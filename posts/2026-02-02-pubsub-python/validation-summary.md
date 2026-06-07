# Validation Summary: How to Use Pub/Sub with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Python (3.8+)
- `google-cloud-pubsub` Python client library
- `gcloud` CLI (Pub/Sub commands, IAM, service accounts, emulator)
- Prometheus client library (`prometheus_client`)
- Python `unittest` and `unittest.mock`
- Dead letter queues (DLQ)
- Message ordering / exactly-once delivery semantics

## Sources Consulted
- Google Cloud Pub/Sub: Handling message failures — https://cloud.google.com/pubsub/docs/handling-failures
- Google Cloud Pub/Sub: Dead-letter topics — https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub Python client library reference (`google.cloud.pubsub_v1`)
- `gcloud pubsub subscriptions create` reference (push vs pull subscriptions, `--message-retention-duration` format)
- `gcloud pubsub subscriptions update` reference (dead-letter and max-delivery-attempts flags)
- Prometheus Python client documentation

## Issues Found

1. **Subscription creation comment was misleading** — The first `gcloud pubsub subscriptions create order-processor` example was labeled `# Create a push subscription that delivers messages to an endpoint`, but the command does not include `--push-endpoint=URL`, so it actually creates a pull subscription (Pub/Sub's default). Updated the comment to `# Create a pull subscription for order processing` to match the actual behavior.

2. **Incorrect dead-letter topic attribute names** — In `dlq_processor.py`, `parse_dlq_message` read `message.attributes.get("googclient_deliveryattempt", 0)` and `message.attributes.get("googclient_subscription", "unknown")`. Per Google's official docs, these attributes do not exist on DLT-forwarded messages. The actual attributes Pub/Sub adds to messages forwarded to a dead-letter topic are `CloudPubSubDeadLetterSourceDeliveryCount` and `CloudPubSubDeadLetterSourceSubscription`. (`googclient_deliveryattempt` is a separate Java/C# client-library artifact on the original subscription, not a DLT attribute, and `googclient_subscription` doesn't exist in the Pub/Sub API at all.) Replaced both attribute lookups with the correct names so the code will actually read the delivery count and source subscription from forwarded DLQ messages.

## Review Notes
- `datetime.utcnow()` (used in `parse_dlq_message`) is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`, but it still works and is not technically incorrect.
- `from google.cloud.pubsub_v1.types import Encoding` is imported in the ordered publisher example but never used. Harmless but could be removed.
- The "Exactly-Once Subscriber" example implements client-side deduplication via an in-memory hash cache, which is a reasonable application-level pattern but is not the same as Google Cloud Pub/Sub's native exactly-once delivery feature (which is enabled at the subscription level via `--enable-exactly-once-delivery` and surfaces through `AckResponse` from `message.ack_with_response()`). The example is correctly described as application-level deduplication; readers wanting native exactly-once should additionally enable it on the subscription.
- The integration-test example's `PublisherClient.create_topic` / `SubscriberClient.create_subscription` calls still exist in the current `google-cloud-pubsub` library and work against the emulator, so the example is functional.
- `--message-retention-duration=7d` is a valid gcloud duration format (the flag accepts duration strings like `7d`, `1h`, `600s`).
