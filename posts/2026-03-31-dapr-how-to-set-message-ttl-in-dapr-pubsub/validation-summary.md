# Validation Summary: How to Set Message TTL in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr HTTP API (publish endpoint)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Python (`requests` library, Flask)
- Node.js (`axios` library)
- Redis Streams (as pub/sub broker)
- YAML component configuration

## Sources Consulted
- Dapr Pub/Sub Message TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-message-ttl/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK `publish_event` method signature
- Dapr component spec for `pubsub.redis`: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/

## Issues Found
No technical issues found.

## Review Notes
- The broker TTL support table is accurate. Worth noting that Dapr handles TTL at the runtime level for most brokers (Redis, RabbitMQ, NATS, AWS SQS), while some brokers like Azure Service Bus have native TTL support. Apache Kafka uses topic-level `retention.ms` for TTL-like behavior, with Dapr adding per-message TTL handling on top. The blog's note of "Yes (via log retention)" for Kafka is a reasonable simplification.
- All code examples are syntactically correct and use current, non-deprecated APIs.
- The subscriber handler correctly uses Dapr's expected response statuses (`SUCCESS`, `DROP`).
- The `publish_metadata` parameter in the Dapr Python SDK `publish_event` call is confirmed correct.
- The HTTP API endpoint format, query parameter metadata passing, and 204 response code are all accurate.
