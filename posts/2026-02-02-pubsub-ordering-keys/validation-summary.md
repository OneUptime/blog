# Validation Summary: How to Implement Pub/Sub Ordering Keys for Message Sequencing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- gcloud CLI
- Python (`google-cloud-pubsub` client library, `pubsub_v1`)
- Node.js / TypeScript (`@google-cloud/pubsub` client library)
- Google Cloud Monitoring (`google-cloud-monitoring`, `monitoring_v3`)
- Mermaid diagrams

## Sources Consulted
- Pub/Sub ordering docs: https://cloud.google.com/pubsub/docs/ordering
- gcloud pubsub topics create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- gcloud pubsub subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Python Pub/Sub PublisherClient reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Python Pub/Sub Subscriber Message reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Node.js Pub/Sub Topic reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic

## Issues Found
1. **Incorrect `--message-ordering-enabled` flag on `gcloud pubsub topics create`.**
   - The post claimed topics needed to be created with `gcloud pubsub topics create orders-topic --message-ordering-enabled --project=your-project-id` and stated "Topics must have message ordering enabled at creation time. You cannot enable ordering on existing topics."
   - This is wrong: message ordering in Pub/Sub is a **subscription-level** setting, not a topic-level setting. The `--message-ordering-enabled` flag does not exist on `gcloud pubsub topics create`. Only subscriptions accept `--enable-message-ordering`.
   - **Fix**: Rewrote the "Creating a Topic with Message Ordering Support" section to "Creating a Topic", removed the bogus flag, and explained that ordering is configured on the subscription and the publisher client opts in via `enable_message_ordering` / `enableMessageOrdering`. Moved the "cannot change after creation" caveat down to the subscription section, where it actually applies.

2. **Misleading comment about topic creation in the Node.js example.**
   - The TypeScript code had a comment saying `// The topic must have been created with ordering support`, which reinforced the same incorrect assumption.
   - **Fix**: Updated the comment to clarify that `enableMessageOrdering: true` is a client-side opt-in to honor ordering keys, not a property of the topic itself.

3. **Misleading summary bullet.**
   - The Summary said "Topics and subscriptions must both enable message ordering" — same conceptual error.
   - **Fix**: Changed to "Subscriptions must enable message ordering, and publisher clients must opt in to honor ordering keys".

## Review Notes
- The Python publisher uses `publisher.stop()` — this is valid; `PublisherClient.stop()` flushes outstanding messages and prevents further `publish()` calls. (It is not the only option — the client also supports context-manager use — but the form shown is correct.)
- `publisher.resume_publish(topic_path, ordering_key)` (Python) and `topic.resumePublishing(orderingKey)` (Node.js) are correct APIs for unblocking a stuck ordering key after a publish failure.
- The DLQ subscriber uses `message.delivery_attempt`. This attribute is only populated when the subscription has a dead-letter policy configured; otherwise it is `None`. The post falls back to `message.delivery_attempt or 1`, which handles the missing case gracefully, but readers should know that they need to configure a dead-letter policy on the subscription (separately from the topic-level DLQ publishing in the example) for `delivery_attempt` to be meaningful and for Pub/Sub to do native DLQ forwarding. The example takes a manual approach (the subscriber forwards to a DLQ topic itself), which is fine but worth noting as a design choice.
- All other gcloud, Python, and Node.js APIs/snippets (`--enable-message-ordering`, `--enable-exactly-once-delivery`, `--ack-deadline`, `enable_message_ordering=True` in `PublisherOptions`, `topic.publishMessage`, `subscription.on('message', ...)`, `flowControl`, etc.) were verified against current official documentation and are correct.
- The mermaid diagrams are conceptually accurate.
