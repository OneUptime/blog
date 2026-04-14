# Validation Summary: How to Configure Dapr Pub/Sub Message TTL

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Pub/Sub building block
- Dapr HTTP Publish API (`/v1.0/publish`)
- CloudEvents specification
- Redis Streams (pub/sub component)
- Azure Service Bus (pub/sub component)
- Python (requests library)
- Go (net/http standard library)
- Node.js (axios library)

## Sources Consulted
- Dapr Message TTL documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-message-ttl/
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Redis Streams component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Azure Service Bus Topics component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr CloudEvents documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Azure Service Bus dead-letter queues — https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues

## Issues Found

1. **Incorrect Redis component-level TTL field**: The post showed `processingTimeout` as the component-level default TTL metadata field for Redis pub/sub. This is wrong — `processingTimeout` controls how long a message must be pending before Dapr attempts redelivery, not message expiration. Redis Streams in Dapr does not have a component-level default TTL metadata field; TTL is only supported per-message via `metadata.ttlInSeconds`. Removed the incorrect Redis component YAML example entirely.

2. **Unused Python import**: The Python example imported `time` but never used it. Removed the unused import.

3. **Node.js top-level await with CommonJS**: The Node.js example used `require('axios')` (CommonJS syntax) alongside top-level `await` (only available in ES modules). This code would throw a SyntaxError at runtime. Wrapped the `await` calls in an `async function main()` with a `main()` invocation.

## Review Notes
- The Go example does not close `resp.Body`, which is a resource leak per Go best practices. Not fixed since it's a style/best-practice issue rather than a correctness error, and the code compiles and runs.
- The Kafka TTL behavior described in "Detecting Expired Messages" is slightly simplified. Kafka doesn't natively support per-message TTL; Dapr implements it at the runtime level by checking expiration on the consumer side rather than the broker discarding messages. The end result is similar for users, but the mechanism differs from what "silently discarded" implies.
- The Azure Service Bus `defaultMessageTimeToLiveInSec` field only applies during subscription creation and cannot be modified after the subscription exists — worth noting for readers who try to change it on existing subscriptions.
- The CloudEvents example correctly uses lowercase `ttlinseconds` per the CloudEvents specification requirement that extension attribute names consist of lowercase letters.
