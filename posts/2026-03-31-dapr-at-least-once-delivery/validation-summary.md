# Validation Summary: How to Implement At-Least-Once Delivery in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, state management, resiliency policies)
- JavaScript / Node.js with Express
- `@dapr/dapr` JavaScript SDK
- PostgreSQL (ON CONFLICT upsert syntax)
- CloudEvents specification
- Message brokers (Kafka, RabbitMQ, Azure Service Bus referenced)

## Sources Consulted
- Dapr State Management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr JavaScript SDK (`@dapr/dapr`) source and type definitions for `KeyValuePairType` and `IStateOptions`
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents publishing documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Resiliency policies documentation — https://docs.dapr.io/operations/resiliency/policies/
- Other validated blog posts in this repository using the same SDK patterns

## Issues Found

### 1. State save TTL in wrong field (line 59)
- **What was wrong:** The code specified TTL as `options: { ttlInSeconds: PROCESSED_KEY_TTL }`. In the Dapr state API and `@dapr/dapr` SDK, the `options` field only accepts `concurrency` and `consistency` settings. TTL must be specified under the `metadata` field, and the value must be a string, not a number.
- **What was changed:** Changed `options: { ttlInSeconds: PROCESSED_KEY_TTL }` to `metadata: { ttlInSeconds: String(PROCESSED_KEY_TTL) }`.
- **Why:** The Dapr HTTP state API expects `"metadata": { "ttlInSeconds": "86400" }`. The SDK passes state objects directly to this API. Using `options` would silently ignore the TTL, causing processed-message keys to persist indefinitely instead of expiring after 24 hours.

### 2. Wrong CloudEvent metadata key (line 123)
- **What was wrong:** The publisher code used `cloudevent_id` (underscore) as the metadata key to override the CloudEvent ID. The correct key is `"cloudevent.id"` (dot notation).
- **What was changed:** Changed `cloudevent_id: messageId` to `"cloudevent.id": messageId`.
- **Why:** Dapr uses dot-notation for CloudEvent attribute overrides in publish metadata (e.g., `cloudevent.id`, `cloudevent.source`, `cloudevent.type`). Using underscore notation would not override the CloudEvent ID, causing Dapr to auto-generate a random ID instead.

### 3. Unused import and non-stable idempotency key (lines 115, 120)
- **What was wrong:** The publisher code imported `uuidv4` from the `uuid` package but never used it. Additionally, the message ID included `Date.now()`, making it non-deterministic — contradicting the section's guidance to use a "stable, unique ID". If the publisher retried a failed publish, it would produce a different ID each time, defeating deduplication.
- **What was changed:** Removed the unused `uuid` import. Changed the message ID from `` `order-${order.orderId}-${Date.now()}` `` to `` `order-${order.orderId}` `` to make it truly stable and deterministic.
- **Why:** A stable idempotency key must produce the same value when the same logical operation is retried. Using `Date.now()` violates this property.

## Review Notes
- The post correctly explains at-least-once delivery semantics and the need for idempotent handlers. The overall architecture (CloudEvent ID-based deduplication with state store, database upserts, resiliency policies) is sound.
- The Dapr resiliency configuration is correct: `maxRetries: -1` for unlimited retries, `policy: exponential` with `duration` and `maxInterval` are valid fields.
- The curl-based testing commands correctly use `application/cloudevents+json` content type with a valid CloudEvent structure.
- The handler returns `res.sendStatus(200)` without a JSON body. This works because Dapr treats any 2xx response without a status JSON body as SUCCESS. However, returning `res.json({ status: "SUCCESS" })` would be more explicit and idiomatic for Dapr pub/sub handlers.
- The idempotency pattern shown has a small race window: if the handler crashes after `fulfillOrder()` but before `state.save()`, the message will be redelivered and processed again. The post could mention this caveat, but it's acceptable for a tutorial-level treatment.
