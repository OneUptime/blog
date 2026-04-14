# Validation Summary: How to Handle Message Ordering in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka (partition-based ordering)
- Redis Streams (insertion-order preservation)
- Node.js / Express (subscriber example)
- JavaScript Fetch API (publisher example)
- Kubernetes (replica scaling)

## Sources Consulted
- Dapr Pub/Sub API Reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Apache Kafka Pub/Sub Component — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Redis Streams Pub/Sub Component — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Component Schema Reference — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Subscription Schema Reference — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Apache Kafka documentation on partition ordering guarantees

## Issues Found

### 1. Partition key passed as HTTP header instead of query parameter
- **What was wrong:** The curl example used `-H "metadata.partitionKey: customer-42"` to pass the partition key as an HTTP header. Dapr's publish API expects metadata as query string parameters, not headers.
- **What was changed:** Replaced the header with a query parameter: `?metadata.partitionKey=customer-42` in the URL.
- **Why:** The Dapr HTTP publish API documents metadata passing via query parameters prefixed with `metadata.`. Using a header would not route the message to the intended partition.

### 2. Subscriber accessing `req.body` instead of `req.body.data`
- **What was wrong:** The subscriber code destructured `req.body` directly (`const { seq, ...event } = req.body`). Dapr wraps pub/sub messages in a CloudEvents envelope by default, so the actual application payload is nested under `req.body.data`.
- **What was changed:** Updated to `const { seq, ...event } = req.body.data`.
- **Why:** Without accessing `.data`, the subscriber would receive CloudEvents metadata fields (`specversion`, `type`, `source`, `id`, etc.) instead of the actual message payload, causing the reordering logic to fail.

### 3. Incomplete Kafka component YAML in "Single Consumer" section
- **What was wrong:** The component YAML only contained `maxConcurrentHandlers` in its metadata, missing the required `brokers` field and the `consumerGroup` field. This would not be a functional component definition.
- **What was changed:** Added `brokers: kafka:9092` and `consumerGroup: order-processor` to the metadata, consistent with the earlier Kafka component example in the post.
- **Why:** The `brokers` field is required for the Kafka pub/sub component. Without it, the component would fail to initialize.

## Review Notes
- The `maxConcurrentHandlers` field is a general Dapr pub/sub component metadata field, not Kafka-specific. It works across multiple pub/sub component types. The post implies it is Kafka-specific by only showing it in a Kafka component, but this is not technically wrong.
- The application-level sequence number pattern is a valid approach but has limitations not mentioned in the post: it assumes a single publisher (the in-memory `seq` counter would not be consistent across multiple publisher instances) and does not handle message loss (the subscriber would block indefinitely waiting for a missing sequence number). These are design considerations rather than errors.
- The `apiVersion: dapr.io/v1alpha1` is still the current component manifest version as of the latest Dapr releases.
- The Redis Streams component fields (`redisHost`, `consumerID`) and Kafka component fields (`brokers`, `consumerGroup`, `initialOffset`) are all verified correct.
