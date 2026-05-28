# Validation Summary: How to Enable Message Ordering in Pub/Sub Using Ordering Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub ordering keys
- Google Cloud CLI
- Terraform Google provider
- Python Google Cloud Pub/Sub client library

## Sources Consulted
- Google Cloud Pub/Sub documentation: Order messages - https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub documentation: Publish messages to topics - https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub documentation: Retry requests - https://docs.cloud.google.com/pubsub/docs/retry-requests
- Google Cloud Python client reference: PublisherOptions - https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.PublisherOptions
- Google Cloud Python client reference: PublisherClient - https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Terraform Google provider: google_pubsub_subscription - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The post stated that messages with the same ordering key are delivered in publish order without mentioning Pub/Sub's same-region requirement. Updated the explanation to say the guarantee applies when messages for the same key are published in the same region.
- The subscription section said to "create or update" a subscription with ordering enabled, but Pub/Sub message ordering can only be set when the subscription is created. Updated the wording to "Create a subscription."
- The Python publisher section said omitting `future.result()` could cause messages to arrive at Pub/Sub servers out of order. The Python client supports ordered publishing for a single publisher client when message ordering is enabled, so this was too strong. Updated the text to frame `future.result()` as a simple confirmation and failure-handling pattern.
- The key selection guidance said Pub/Sub can only deliver one message at a time for a given key. That is too broad across subscriber types; with StreamingPull, the callback for a key runs to completion before the next callback for that key. Updated the statement and added the documented 1 MBps publish throughput limit per ordering key.
- The publish failure sample only caught `GoogleAPICallError`, while the official Python ordered-publish retry sample catches `RuntimeError` when resuming an ordering key after an unrecoverable ordered publish error. Updated the sample to catch both.
- The subscriber section said the next message is not delivered until the current one is acknowledged. For Python StreamingPull, the relevant documented behavior is callback completion for a given ordering key, with acknowledgements inside the callback preserving ordered computation. Updated the wording accordingly.

## Review Notes
The remaining examples and configuration snippets are technically valid. The sample uses a global Pub/Sub endpoint; for multi-region publisher deployments, a future improvement would be to show a locational Pub/Sub endpoint so the same-region ordering requirement is explicit in code.
