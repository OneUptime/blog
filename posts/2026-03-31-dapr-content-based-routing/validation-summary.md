# Validation Summary: How to Use Content-Based Routing in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, content-based routing)
- CEL (Common Expression Language) for routing expressions
- CloudEvents specification
- Kubernetes (Dapr Subscription CRD)
- Node.js / Express.js
- curl (for testing)

## Sources Consulted
- Dapr Subscription spec documentation: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr How-To: Route messages to different event handlers: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription methods (declarative, streaming, programmatic): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- CEL Specification: https://github.com/google/cel-spec

## Issues Found
- **`scopes` field indentation in Subscription YAML**: The `scopes` field was placed at the document root level (same indentation as `apiVersion`, `kind`, `metadata`, `spec`), but in the Dapr Subscription CRD `scopes` must be nested under `spec`. Fixed by indenting `scopes` and its list items to be children of `spec`.

## Review Notes
- The `apiVersion: dapr.io/v2alpha1` is confirmed correct for the current Dapr Subscription CRD.
- The `pubsubname` field (lowercase) is correct per the Dapr spec.
- CEL expressions using `event.type`, `event.data`, `event.source` prefixes are correct for Dapr routing rules.
- CEL functions `has()` and `startsWith()` are confirmed supported in Dapr routing expressions.
- The publish API endpoint `/v1.0/publish/{pubsubname}/{topic}` is correct.
- The Node.js Express handler code is syntactically correct and follows standard patterns for Dapr pub/sub handlers.
- The first curl test example sends plain JSON (not a full CloudEvent), which means Dapr will auto-wrap it as a CloudEvent. The routing rule `event.data.priority == "CRITICAL"` would match because Dapr places the published JSON body into the `data` field of the generated CloudEvent. This is technically correct behavior but could benefit from a brief explanatory note in a future revision.
