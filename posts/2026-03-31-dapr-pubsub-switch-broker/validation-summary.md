# Validation Summary: How to Switch Pub/Sub Brokers Without Changing Application Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Redis Streams (pubsub.redis component)
- RabbitMQ (pubsub.rabbitmq component)
- Apache Kafka (pubsub.kafka component)
- Python (requests library)
- Kubernetes (kubectl)
- Dapr CLI

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Redis Streams pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr RabbitMQ pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Apache Kafka pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CloudEvents integration: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/

## Issues Found

1. **RabbitMQ metadata field name incorrect**: The post used `host` as the metadata field name for the RabbitMQ connection string. The correct field name per official Dapr docs is `connectionString`. Changed `host` to `connectionString`.

2. **Kafka `authRequired` field deprecated**: The post used `authRequired: "false"` which has been deprecated since Dapr v1.6. The replacement is the `authType` field. Changed to `authType: "none"`.

3. **CLI flag `--components-path` deprecated**: The post used `dapr run --components-path` which is deprecated in favor of `--resources-path`. Changed to `--resources-path`.

## Review Notes
- The publish API endpoint (`/v1.0/publish/{pubsubname}/{topic}`) is correct.
- The Redis component configuration (`pubsub.redis` with `redisHost`) is correct.
- The claims about CloudEvents envelope format and broker-agnostic dead-letter topics are accurate — both are Dapr-level abstractions that work identically regardless of the underlying broker.
- The Kubernetes workflow (kubectl apply + rollout restart) is a valid approach for swapping components.
- The overall architectural claim — that Dapr's component abstraction allows broker switching without code changes — is accurate and well-demonstrated.
