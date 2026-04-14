# Validation Summary: How to Implement Topic Exchange with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub building block
- Dapr declarative Subscription resources (v2alpha1)
- CEL (Common Expression Language) for routing rules
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis Streams pub/sub component (`pubsub.redis`)

## Sources Consulted
- Dapr Pub/Sub message routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Subscription schema reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Redis Streams pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/

## Issues Found

### 1. Incorrect use of `subscribeWithOptions` for programmatic routing rules
**What was wrong:** The post used `server.pubsub.subscribeWithOptions('events-pubsub', 'orders', { route: { rules: [...], default: '...' } })` to set up routing rules programmatically. The Dapr JS SDK does not use `subscribeWithOptions` with a `route` property for this purpose.
**What was changed:** Replaced with `server.pubsub.subscribe('events-pubsub', 'orders', { default: '/orders/default', rules: [...] })`, which passes the routing rules object directly as the third argument to `subscribe()`, matching the official SDK documentation.

### 2. Incorrect use of `subscribe` for route handlers
**What was wrong:** The post used `server.pubsub.subscribe('events-pubsub', 'orders/express', callback)` to register handlers for routed messages. This incorrectly treats the route path as a topic name. The `subscribe` method with a topic argument subscribes to an actual pub/sub topic, not a routed path.
**What was changed:** Replaced all route handler registrations with `server.pubsub.subscribeToRoute('events-pubsub', 'orders', 'orders/express', callback)`, which is the correct SDK method for handling messages routed to specific paths within a topic subscription.

## Review Notes
- The `require('@dapr/dapr')` CommonJS import style is acceptable but the official Dapr docs now prefer ES module `import` syntax. This is a stylistic choice, not an error.
- The DaprServer constructor omits `clientOptions` (with `daprHost`/`daprPort`) which most official examples include, but the constructor will use defaults and work without it.
- CEL functions `startsWith()` and the `in` operator used in the "Using CEL Expressions" section are standard CEL features but are not explicitly demonstrated in the Dapr routing docs. They should work since Dapr uses a standard CEL evaluator, but are less battle-tested than the patterns shown in official examples.
- The Dapr docs note that `event.data` field access in CEL only works when the data payload is nested JSON values, not when JSON is escaped as a string. This caveat is not mentioned in the post.
