# Validation Summary: How to Use Dapr Pub/Sub with Multiple Message Brokers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka (pubsub.kafka component)
- RabbitMQ (pubsub.rabbitmq component)
- Redis (pubsub.redis component)
- JavaScript / Node.js (programmatic subscription example)

## Sources Consulted
- Dapr Kafka pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr RabbitMQ pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Redis Streams pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Subscription methods (declarative, programmatic, streaming): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Component schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component scoping: https://docs.dapr.io/operations/components/component-scopes/

## Issues Found

### 1. RabbitMQ metadata field name (`host` -> `connectionString`)
- **What was wrong:** The RabbitMQ component YAML used `host` as the metadata field name for the AMQP connection string. The `host` field is deprecated in current Dapr versions.
- **What was changed:** Replaced `host` with `connectionString`, which is the current correct metadata field name for the RabbitMQ pub/sub component.
- **Why:** Using the deprecated `host` field may cause warnings or failures with newer Dapr runtimes. The official Dapr documentation specifies `connectionString` as the correct field.

### 2. Component scoping placement (`scopes` nested under `spec` -> root level)
- **What was wrong:** The scoping example showed `scopes` indented under `spec`, implying it is a child of the `spec` field. In Dapr's component schema, `scopes` is a root-level field (sibling to `spec`, `metadata`, and `apiVersion`).
- **What was changed:** Restructured the scoping example to show a complete component YAML with `scopes` at the root level (no indentation, same level as `spec`).
- **Why:** Placing `scopes` under `spec` would cause Dapr to ignore the scoping configuration, meaning all apps would have access to the component instead of only the intended ones.

## Review Notes
- The declarative subscription examples use `apiVersion: dapr.io/v1alpha1` which is still supported but older. Dapr v1.11+ introduced `dapr.io/v2alpha1` for subscriptions with enhanced routing capabilities. The v1alpha1 format shown is still functional but readers building new applications may want to consider v2alpha1.
- The programmatic subscription example uses the simple `route` field (string), which is correct for basic routing. For content-based routing, Dapr also supports a `routes` object with `rules` and `default` — but this is beyond the scope of the post.
- All three component types (`pubsub.kafka`, `pubsub.rabbitmq`, `pubsub.redis`) and their `version: v1` are correct.
- The Dapr publish HTTP API format `POST /v1.0/publish/{pubsubname}/{topic}` is correct.
