# Validation Summary: How to Handle Pub/Sub Message Ordering

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Pub/Sub message ordering
- Pub/Sub ordering keys
- Google Cloud CLI (`gcloud pubsub subscriptions create`)
- Python `google-cloud-pubsub` client library
- Node.js / TypeScript `@google-cloud/pubsub` client library
- Distributed messaging and event-driven architecture patterns

## Sources Consulted
- Google Cloud Pub/Sub message ordering documentation: https://cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publish with ordering keys sample: https://cloud.google.com/pubsub/docs/samples/pubsub-publish-with-ordering-keys
- Google Cloud Pub/Sub resume publishing with ordering keys sample: https://cloud.google.com/pubsub/docs/samples/pubsub-resume-publish-with-ordering-keys
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub exactly-once delivery documentation: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Python Pub/Sub client reference for `PublisherClient.publish()` and `resume_publish()`: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Node.js Pub/Sub `Topic` / publisher source and `PublishOptions` interface: https://github.com/googleapis/nodejs-pubsub/blob/main/src/topic.ts and https://github.com/googleapis/nodejs-pubsub/blob/main/src/publisher/index.ts
- Node.js Pub/Sub subscriber / flow control source: https://github.com/googleapis/nodejs-pubsub/blob/main/src/subscriber.ts and https://github.com/googleapis/nodejs-pubsub/blob/main/src/lease-manager.ts

## Issues Found
- The post described ordered delivery as "publish order" without the regional receive-order caveat. Updated the wording to match Pub/Sub's guarantee: messages with the same ordering key must be published to the same publish region, and ordered subscriptions receive them in the order Pub/Sub receives them.
- The post stated "one subscriber per key" and "one message per key at a time." That was too absolute. Updated the language to reflect the documented client-library behavior: callbacks for a given ordering key are run to completion in order, and throughput is limited by processing speed per key.
- The "Regional ordering" and "Cross-region ordering" bullets implied subscribers must be in the same region. Updated them to clarify that the same-region requirement applies to publishers for the same ordering key; subscribers can connect from any region.
- The Python and TypeScript subscriber examples treated identical message payload checksums as duplicates. That can incorrectly drop legitimate repeated business events. Removed checksum-based duplicate decisions and kept duplicate detection based on Pub/Sub message ID.
- The TypeScript publisher example used `enableMessageOrdering` in `PublishOptions`. Current `@google-cloud/pubsub` publisher options expose the field as `messageOrdering`; updated the option name and related comment.
- Removed an unused Python import (`from concurrent import futures`) and an unused TypeScript import (`PublishOptions`) from the examples.

## Review Notes
- The `gcloud pubsub subscriptions create SUBSCRIPTION_ID --topic=TOPIC_ID --enable-message-ordering` command is correct, and the flag cannot be changed after subscription creation.
- The Python `PublisherOptions(enable_message_ordering=True)`, `BatchSettings`, `publisher.publish(..., ordering_key=...)`, `PublisherClient.resume_publish()`, `SubscriberClient.subscribe()`, `FlowControl`, and message `ack()` / `nack()` usage match the current Python client API.
- The Node.js `topic.publishMessage({ data, orderingKey, attributes })`, `topic.resumePublishing(orderingKey)`, `topic.flush()`, message `ack()` / `nack()`, `message.id`, and `message.orderingKey` usage match the current Node.js client API after the `messageOrdering` correction.
- The post correctly distinguishes ordered delivery from exactly-once application processing. Pub/Sub also has an optional exactly-once delivery feature for pull subscriptions, but that is outside the main scope of this ordering-focused guide.
