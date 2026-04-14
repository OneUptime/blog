# Validation Summary: How to Disable CloudEvents in Dapr Pub/Sub for Raw Messages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Pub/Sub (rawPayload / isRawPayload metadata)
- CloudEvents 1.0
- Dapr Go SDK (go-sdk client and service/common packages)
- Dapr Python SDK (dapr-client)
- Dapr JavaScript/TypeScript SDK (@dapr/dapr)
- Dapr HTTP API (publish endpoint)
- Dapr Declarative Subscriptions (v2alpha1)
- Apache Kafka (kafka-console-producer)
- Redis Streams (as pub/sub broker)

## Sources Consulted
- Dapr raw payload documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr subscription schema reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Go SDK (pkg.go.dev): https://pkg.go.dev/github.com/dapr/go-sdk/service/common (TopicEvent struct, handler signature)
- Dapr Go SDK client: https://pkg.go.dev/github.com/dapr/go-sdk/client (PublishEvent, PublishEventWithMetadata, PublishEventWithContentType)
- Dapr Python SDK source: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py (publish_event signature)
- Dapr Python client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr JS SDK client docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK PubSubPublishOptions type: https://github.com/dapr/js-sdk (metadata field in options)
- Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Apache Kafka quickstart (kafka-console-producer flags): https://kafka.apache.org/quickstart

## Issues Found

1. **Python SDK DaprClient used as async (incorrect)**: The blog used `async with DaprClient() as client:` and `await client.publish_event(...)`. The Dapr Python SDK's `DaprClient` is synchronous and does not support async context managers or awaiting `publish_event`. Fixed to `with DaprClient() as client:` and `client.publish_event(...)`.

2. **Declarative subscription YAML used wrong metadata key**: The blog used `rawPayload: "true"` in the declarative YAML subscription metadata. Per the official Dapr docs, declarative YAML subscriptions require `isRawPayload: "true"` (not `rawPayload`). The `rawPayload` key is used for programmatic SDK subscriptions and publish-side metadata. Fixed to `isRawPayload: "true"`.

3. **Subscription YAML used deprecated `route` field**: The blog used `route: /orders` in a `v2alpha1` Subscription spec. The `v2alpha1` API version requires `routes: default: /orders` (plural with nested default). The singular `route` field was only valid in the deprecated `v1alpha1`. Fixed to use `routes: default:`.

4. **Component-level rawPayload section was inaccurate**: The blog had an "Option 3: Component-Level Raw Payload" section with a Redis component YAML that had a misleading comment ("All publish/subscribe on this component bypass CloudEvents") but contained no rawPayload configuration. It also showed a Kafka component with `rawPayload: "true"` in component metadata. Neither the Redis nor Kafka component reference documentation lists `rawPayload` as a component-level metadata field. Raw payload is a per-publish or per-subscription feature, not a component-level setting. Rewrote this section to accurately describe per-subscription declarative YAML configuration.

5. **kafka-console-producer used wrong flag**: The blog used `--broker kafka:9092` but the correct flag is `--bootstrap-server kafka:9092` (per Apache Kafka documentation). Fixed.

6. **Removed duplicate YAML subscription example**: After fixing Option 3, the "Subscribing to Raw Messages" section contained a duplicate of the same YAML subscription. Removed the duplicate, keeping the section focused on handler code.

## Review Notes
- The Go SDK also provides a convenience option `PublishEventWithRawPayload()` that can be used instead of manually passing `rawPayload: "true"` via `PublishEventWithMetadata`. The blog's approach using metadata is valid but the dedicated option is cleaner.
- Disabling CloudEvents removes support for tracing, event deduplication per messageId, content-type metadata, and other CloudEvent-based features. The blog does not mention this trade-off, which could be a useful addition in a future update.
- The Go subscriber handler returns `(retry bool, err error)` — the blog returns `false, err` on error (no retry), which is a valid choice but readers should be aware the boolean controls retry behavior.
- The programmatic subscription metadata key differs between declarative YAML (`isRawPayload`) and SDK programmatic subscriptions (`rawPayload` for Go/Python/JS, `isRawPayload` for .NET). The blog correctly uses `rawPayload` in the programmatic Go and Python subscription examples.
