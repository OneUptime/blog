# Validation Summary: How to Implement Materialized Views with Dapr State and Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub building blocks)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis (as state store and pub/sub broker)
- CQRS / Materialized View pattern
- Node.js / Express

## Sources Consulted
- Dapr JavaScript Client SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript Server SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr Redis State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Pub/Sub How-To guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr State Management How-To guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/

## Issues Found
1. **Missing `DaprClient` declaration in projection service snippet**: The projection service code block used `client.state.get()` and `client.state.save()` without declaring a `DaprClient` instance. Added `const client = new DaprClient();` after the `DaprServer` declaration.

2. **Rebuild function would double-count data**: The `rebuildProjection` function replayed all historical orders as `order.created` events without first clearing the existing projection state. Since the subscriber handler increments `orderCount` and adds to `totalSpent`, replaying on top of existing state would produce incorrect totals. Added `client.state.delete('projection-store', viewKey)` to clear the existing projection before replaying events.

## Review Notes
- All Dapr component YAML configurations (`state.redis`, `pubsub.redis`) are correct with proper `apiVersion`, `kind`, `spec.type`, `spec.version`, and metadata fields.
- All Dapr JS SDK method signatures (`client.pubsub.publish`, `client.state.get`, `client.state.save`, `server.pubsub.subscribe`, `server.start`) are correct and match official documentation.
- The subscribe callback parameter is named `event` but actually receives the unwrapped data payload (not a full CloudEvent envelope). This is a minor naming convention preference and not a functional issue since the field accesses are correct.
- The rebuild approach has an inherent race condition: if new orders arrive while replaying historical events, they could be processed out of order or the new order's projection update could be overwritten by the replay. A production implementation would need to pause the subscriber or use a separate replay topic. This is acceptable for a tutorial-level post.
