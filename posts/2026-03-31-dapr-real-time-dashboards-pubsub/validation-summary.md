# Validation Summary: How to Build Real-Time Dashboards with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub
- @dapr/dapr JavaScript SDK (DaprClient)
- WebSocket (ws library)
- Express.js
- Redis (ioredis) for WebSocket backplane scaling
- Dapr declarative Subscription YAML
- Dapr content-based routing (CEL expressions)

## Sources Consulted
- Dapr Subscription specification format reference post (`posts/2026-03-31-dapr-understand-subscription-specification-format/README.md`) — confirms `apiVersion: dapr.io/v2alpha1` and `spec.routes.default` structure
- Dapr content-based routing post (`posts/2026-03-31-dapr-how-to-implement-content-based-routing-with-dapr/README.md`) — confirms CEL expressions use `event.data.<field>` for custom data fields
- Multiple validated Dapr pub/sub posts in the repo confirming `client.pubsub.publish()` API and `event.data.*` CEL patterns
- Dapr pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr subscription spec documentation: https://docs.dapr.io/reference/resource-specs/subscription-schema/

## Issues Found

1. **Unused `DaprServer` import**: The WebSocket bridge code imported `DaprServer` from `@dapr/dapr` but never used it. The code uses raw Express endpoints to receive Dapr subscription callbacks, which is valid but the import was dead code. Removed the unused import line.

2. **Incorrect Subscription YAML apiVersion**: Both subscription YAML blocks used `apiVersion: dapr.io/v1alpha1`. The current Dapr subscription specification uses `apiVersion: dapr.io/v2alpha1`. Updated both blocks.

3. **Incorrect simple subscription route field**: The first subscription YAML used `spec.route: /dashboard-metrics` (singular). The v2alpha1 spec uses `spec.routes.default` instead. Changed to `spec.routes.default: /dashboard-metrics`.

4. **Incorrect CEL expression for content-based routing**: The multi-topic routing rules used `event.type == "metrics"` and `event.type == "alerts"`. Since `type` here refers to a custom field in the published data payload (not the CloudEvents standard `type` attribute), the correct CEL expressions are `event.data.type == "metrics"` and `event.data.type == "alerts"`. Updated both match expressions.

## Review Notes
- The `getCpuUsage()`, `getMemoryUsage()`, and `getRequestRate()` helper functions in the publisher code are referenced but not defined. This is acceptable for a tutorial that focuses on the Dapr/WebSocket integration pattern, but readers will need to implement these themselves.
- The `reconnect()` function in the frontend client is referenced in the `onclose` handler but not defined. Again acceptable for a tutorial snippet but could confuse beginners.
- The Redis backplane scaling section is a sound pattern. Using ioredis pub/sub to synchronize across WebSocket replicas is a well-established approach.
