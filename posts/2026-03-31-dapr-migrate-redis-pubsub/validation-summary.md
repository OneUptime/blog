# Validation Summary: How to Migrate from Redis Pub/Sub to Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Pub/Sub building block
- Redis Streams (via `pubsub.redis` component)
- Node.js (publisher and subscriber examples)
- Express.js (subscriber HTTP server)
- Axios (HTTP client for publishing)
- Redis Pub/Sub (the "before" pattern being migrated away from)

## Sources Consulted
- Dapr Pub/Sub component reference for Redis Streams: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Publish HTTP API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr programmatic subscriptions: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr dead-letter topic documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr CloudEvents and pub/sub message format: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Node.js `redis` package API (v4.x): https://github.com/redis/node-redis

## Issues Found

### 1. CloudEvents envelope not accounted for in subscriber code
- **What was wrong:** The subscriber handler used `const order = req.body` to access the message payload. Dapr wraps all pub/sub messages in a CloudEvents 1.0 envelope by default, so the actual payload is at `req.body.data`, not `req.body` directly. Using `req.body` would give the entire CloudEvents envelope object, and `req.body.id` would return the CloudEvents event ID rather than the order ID.
- **What was changed:** Updated `req.body` to `req.body.data` and added a clarifying comment about the CloudEvents envelope.
- **Why:** Without this fix, the subscriber code would not correctly extract the order payload and would silently fail to access `order.id` as intended.

### 2. Incorrect metadata field name `maxLen`
- **What was wrong:** The dead-letter configuration YAML used `maxLen` as a metadata field name for the `pubsub.redis` component.
- **What was changed:** Renamed `maxLen` to `maxLenApprox`, which is the correct field name per the Dapr Redis Streams component reference.
- **Why:** `maxLenApprox` is the documented field name that maps to Redis's `MAXLEN ~` stream trimming option. `maxLen` is not a recognized metadata field and would be silently ignored.

## Review Notes
- The "Before" Redis Pub/Sub code uses the `redis` npm package v4+ API (promise-based with `client.connect()`), which is current and correct.
- The programmatic subscription format using `GET /dapr/subscribe` with the `route` (singular) field is the simpler, correct form. Dapr also supports a `routes` (plural) format with CEL-based routing rules, but the simpler form shown is appropriate for this tutorial.
- The comparison table's claims are all accurate: Dapr's `pubsub.redis` uses Redis Streams (not Redis Pub/Sub) under the hood, providing message persistence, consumer groups, at-least-once delivery, and dead-letter support.
- The post could mention that subscribers can opt out of CloudEvents wrapping by setting `rawPayload: "true"` in the subscription metadata, but this is not an error — just an optional enhancement.
