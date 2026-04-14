# Validation Summary: How to Use Dapr Pub/Sub for Saga Choreography

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Pub/Sub building block
- Dapr State Management building block
- Dapr Programmatic Subscriptions with content-based routing (CEL expressions)
- Express.js (Node.js)
- CloudEvents specification

## Sources Consulted
- Dapr Pub/Sub overview and how-to: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr subscription methods (programmatic, declarative, streaming): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr content-based routing / message routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr State Management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr JavaScript SDK reference: https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found
No technical issues found.

## Review Notes
- The `routes` object in the `/dapr/subscribe` response omits the optional `default` path. This is valid per the Dapr spec, but in production, unmatched events on a subscribed topic will not be routed to any handler. For a tutorial this is acceptable since only known event types are published to each topic.
- The summary's claim that "Dapr's reliable delivery ensures compensating transactions are eventually applied" is accurate in general — Dapr pub/sub supports at-least-once delivery semantics — but the actual reliability guarantee depends on the underlying message broker component (e.g., Redis Streams, Kafka, RabbitMQ). Readers should be aware that broker selection affects delivery guarantees.
- The `client.state.get()` call in `updateOrderStatus` returns the deserialized value directly, so the spread `{ ...current, status, reason }` works correctly. However, there is no null check — if the order key doesn't exist, `current` would be null/undefined and the spread would still work (spreading null/undefined is a no-op in JavaScript), but the resulting object would lose all original order fields. This is a minor robustness concern, not a correctness error for the tutorial context.
