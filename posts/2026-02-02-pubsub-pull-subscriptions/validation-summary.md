# Validation Summary: How to Implement Pull Subscriptions in Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide — multi-language implementation walkthrough for Google Cloud Pub/Sub pull subscriptions, with Python, Node.js, and Java code samples plus gcloud CLI commands.

## Technologies Covered
- Google Cloud Pub/Sub (topics, pull subscriptions, dead-letter topics, retry policies, message ordering, filters)
- `gcloud pubsub` CLI
- Python `google-cloud-pubsub` (`pubsub_v1`) — synchronous `SubscriberClient.pull`, streaming pull via `subscribe`, `FlowControl`, `modify_ack_deadline`
- Python `google-cloud-monitoring` (`monitoring_v3`) for backlog/age metrics
- Node.js `@google-cloud/pubsub` — high-level `Subscription` streaming and low-level `v1.SubscriberClient` for sync pull
- Java `google-cloud-pubsub` — `GrpcSubscriberStub` for sync pull, `Subscriber` for streaming, `FlowControlSettings`, `threeten.bp.Duration`
- Flask (for the health/metrics HTTP endpoint example)

## Sources Consulted
- Google Cloud Pub/Sub sync-pull Node.js sample: https://cloud.google.com/pubsub/docs/samples/pubsub-subscriber-sync-pull
- `googleapis/nodejs-pubsub` synchronousPull sample: https://github.com/googleapis/nodejs-pubsub/blob/main/samples/synchronousPull.js
- Python `Message` reference (delivery_attempt field): https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Python `ReceivedMessage` proto: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.ReceivedMessage
- Python `FlowControl` reference (max_messages, max_bytes, max_lease_duration kwargs): https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- Java error-listener sample (MoreExecutors usage): https://cloud.google.com/pubsub/docs/samples/pubsub-subscriber-error-listener
- `gcloud pubsub subscriptions create` reference for flag names (--ack-deadline, --message-retention-duration, --retain-acked-messages, --dead-letter-topic, --max-delivery-attempts, --expiration-period, --min-retry-delay, --max-retry-delay, --enable-message-ordering, --filter)

## Issues Found

1. **Node.js batch-pull APIs did not exist on the high-level `Subscription` class.** The original code called `this.subscription.pull(...)`, `this.subscription.ack(ackIds)`, and `this.subscription.modifyAckDeadline(nackIds, 0)`. None of these are public methods on `Subscription` — sync pull/ack/modifyAckDeadline in Node.js must go through `v1.SubscriberClient` (the gapic low-level client). Rewrote the constructor to instantiate both `PubSub` (for streaming) and `v1.SubscriberClient` (for sync pull), updated `pullBatch` to call `subClient.pull({subscription, maxMessages})` and unwrap `response.receivedMessages`, updated `processBatch` to iterate `ReceivedMessage` wrappers (`received.message`, `received.ackId`), and replaced ack/nack calls with `subClient.acknowledge` and `subClient.modifyAckDeadline` using the documented request shapes.

2. **Python `delivery_attempt` was read from `message.attributes`.** Pub/Sub does not place the delivery-attempt counter in the message attributes dict — it is a typed field on the `ReceivedMessage` proto (and a property on the streaming-pull `Message` wrapper), populated only when a dead-letter policy is configured. Changed `int(message.message.attributes.get('delivery_attempt', '1'))` to `message.delivery_attempt or 1` and updated the surrounding comment.

3. **Java code referenced `MoreExecutors.directExecutor()` without importing `MoreExecutors`.** Added `import com.google.common.util.concurrent.MoreExecutors;` so the example compiles as written.

## Review Notes
- Spot-checked the gcloud flags in both subscription-create blocks against the current `gcloud pubsub subscriptions create` surface — `--ack-deadline`, `--message-retention-duration`, `--retain-acked-messages`, `--dead-letter-topic`, `--max-delivery-attempts`, `--expiration-period`, `--min-retry-delay`, `--max-retry-delay`, `--enable-message-ordering`, and `--filter` are all current. No changes needed.
- The Python `pubsub_v1.types.FlowControl(max_messages=..., max_bytes=..., max_lease_duration=...)` signature is valid (verified against the official reference).
- The synchronous Python example calls `retry=retry.Retry(deadline=timeout)` — `deadline` is the older parameter name (`timeout` is the modern equivalent). Both still work; left as-is since the post will run correctly.
- The `RobustPullConsumer` keeps an in-process `delivery_counts` dict for retry tracking. Because Pub/Sub may redeliver to a different consumer instance, the post's own comment ("in production, use external storage") already flags this as a teaching example; no change needed.
- The Monitoring API filter strings and `monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL` enum reference are current.
- Mermaid diagrams are illustrative and not subject to API-level verification.
