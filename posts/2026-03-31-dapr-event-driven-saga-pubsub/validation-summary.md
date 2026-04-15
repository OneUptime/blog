# Validation Summary: How to Implement Event-Driven Saga with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr Pub/Sub building block (with Redis Streams backend)
- Dapr State Management building block
- Dapr JavaScript SDK (`@dapr/dapr`)
- Saga pattern for distributed transactions

## Sources Consulted
- Dapr JavaScript Server SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr JavaScript Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Redis Streams Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Pub/Sub CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr JS SDK source code on GitHub: https://github.com/dapr/js-sdk
- `@dapr/dapr` npm package: https://www.npmjs.com/package/@dapr/dapr

## Issues Found

### 1. Missing compensation handlers in Inventory Service
**What was wrong:** The Compensation Chain text diagram described two rollback paths that release the inventory reservation (`payment.failed -> inventory.reservation.cancelled` and `shipment.failed -> payment.refunded -> inventory.reservation.cancelled`), but the Inventory Service code block had no subscription handlers for `payment.failed` or `payment.refunded` events. This meant the described compensation chain was incomplete in the code — inventory reservations would never be released on downstream failures.

**What was changed:** Added two compensation subscription handlers to the Inventory Service code block:
- A handler subscribing to `payment.failed` that calls `releaseInventory()` and publishes `inventory.reservation.cancelled`.
- A handler subscribing to `payment.refunded` that calls `releaseInventory()` and publishes `inventory.reservation.cancelled`.

**Why:** The compensation chain is the core concept of the saga pattern. Leaving it unimplemented in the code examples undermines the tutorial's purpose and could lead readers to build incomplete saga implementations that leak reserved resources on failure.

## Review Notes
- The `DaprServer()` and `DaprClient()` constructors are called with no arguments. This is valid — the SDK defaults to reading host/port from environment variables set by the Dapr sidecar. In production Dapr deployments this works correctly, though standalone examples sometimes pass explicit configuration.
- The subscribe callback uses a single parameter `(event)` while the SDK signature is `(data, headers)`. This is functionally correct since the second parameter is optional to destructure, and the `data` parameter does contain the unwrapped message payload (not the full CloudEvent envelope), so accessing `event.orderId` works as shown.
- The component YAML, API method signatures (`pubsub.subscribe`, `pubsub.publish`, `state.save`), package name (`@dapr/dapr`), and class names (`DaprServer`, `DaprClient`) are all correct and current.
