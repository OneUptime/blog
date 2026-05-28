# Validation Summary: How to Use Retry Logic and Error Handling in Python Pub/Sub Subscribers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub dead letter topics
- Pub/Sub subscription retry policies
- Google Cloud CLI
- Python
- google-cloud-pubsub Python client
- Google Cloud Firestore Python client

## Sources Consulted
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub subscription retry policy documentation: https://docs.cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud Pub/Sub service overview and message states: https://docs.cloud.google.com/pubsub/docs/pubsub-basics
- Google Cloud Pub/Sub subscription properties and message retention documentation: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub Python Message API reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Google Cloud Firestore Python BaseQuery API reference: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.BaseQuery

## Issues Found
- The post said Pub/Sub retries indefinitely without configuration. Pub/Sub redelivers unacknowledged messages until the message retention duration expires, so the retry behavior section was corrected to mention message retention.
- The post described dead-letter forwarding and `max-delivery-attempts` as exact. Pub/Sub documents maximum delivery attempts as approximate and best-effort, so the wording was updated.
- The dead-letter processing example stored `CloudPubSubDeadLetterSourceDeliveryCount` under `original_message_id`. That attribute is the source delivery count, not the original message ID, so the logging key was changed to `source_delivery_count`.
- The dead-letter subscriber example subscribed but did not block on the streaming pull future. It now calls `streaming_pull_future.result()` and cancels cleanly on `KeyboardInterrupt`, matching the pattern used elsewhere in the post.
- The Firestore replay query used positional `.where()` filters. The current Python client supports the `filter` keyword and documents `FieldFilter`, so the example now imports `FieldFilter` and uses `.where(filter=FieldFilter(...))`.

## Review Notes
The local environment did not have the `gcloud` CLI installed, so CLI flags were verified against official Google Cloud documentation instead of local `gcloud --help`. The Python snippets were syntax-checked with `python3` AST parsing.
