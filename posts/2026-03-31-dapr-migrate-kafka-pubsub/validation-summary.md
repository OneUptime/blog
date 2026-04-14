# Validation Summary: How to Migrate from Kafka Direct Usage to Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Pub/Sub building block
- Apache Kafka (via Dapr pubsub.kafka component)
- KafkaJS (Node.js Kafka client)
- Dapr HTTP API (publish, bulk publish, programmatic subscriptions)
- Redis Streams (via Dapr pubsub.redis component for local dev)
- Express.js (subscriber HTTP server)
- Dapr CLI

## Sources Consulted
- Dapr Pub/Sub HTTP API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kafka Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CloudEvents and Pub/Sub subscriber documentation: https://docs.dapr.io/reference/api/pubsub_api/#provide-a-route-for-dapr-to-deliver-topic-events

## Issues Found

1. **Consumer event extraction used `req.body` instead of `req.body.data`**: Dapr wraps published events in a CloudEvents v1.0 envelope before delivering them to subscribers. The actual event payload is in the `data` field of the envelope, not at the top level of the request body. Changed `req.body` to `req.body.data`. Also updated the response from `res.sendStatus(200)` to `res.json({ status: 'SUCCESS' })` to follow Dapr best practices for explicit acknowledgment.

2. **Bulk publish URL used deprecated alpha endpoint**: The blog used `v1.0-alpha1/publish/bulk/...` which was the alpha API. The bulk publish API has been promoted to stable since Dapr 1.12. Changed to `v1.0/publish/bulk/...`.

3. **Bulk publish request body incorrectly wrapped in object**: The blog sent `{ entries: messages }` but the Dapr bulk publish API expects a direct JSON array of entry objects, not wrapped in an `entries` property. Changed to send the array directly.

4. **CLI flag `--components-path` is deprecated**: The `--components-path` flag for `dapr run` has been deprecated in favor of `--resources-path`. Updated to use the current recommended flag.

## Review Notes
- The KafkaJS code examples (before migration) are syntactically correct and use the current KafkaJS API properly.
- The Dapr Kafka component YAML is accurate — all metadata field names (`brokers`, `consumerGroup`, `authType`, `initialOffset`, `disableTls`) are verified correct per Dapr v1.17 docs.
- The programmatic subscription pattern (GET `/dapr/subscribe` returning an array of subscription objects with `pubsubname`, `topic`, and `route`) is correct.
- The Redis pubsub component YAML for local development is correct.
- The post's overall architecture advice (decoupling from Kafka specifics, swapping components for local dev) is sound and well-presented.
