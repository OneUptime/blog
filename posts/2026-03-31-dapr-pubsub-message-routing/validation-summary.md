# Validation Summary: How to Route Messages to Different Event Handlers in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, content-based message routing)
- Redis (as pub/sub broker via `pubsub.redis` component)
- Node.js with Express (subscriber service implementation)
- CloudEvents specification (v1.0)
- CEL (Common Expression Language) for routing rules
- curl (for publishing events)

## Sources Consulted
- Dapr docs — How-To: Route messages to different event handlers: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr docs — Subscription spec (v2alpha1): https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr docs — Subscription methods (programmatic and declarative): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr docs — Pub/Sub API reference (publish endpoint): https://docs.dapr.io/reference/api/pubsub_api/
- Dapr docs — Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: dapr.io/v2alpha1` for the Subscription kind is correct and required for routing rules support. The older `v1alpha1` only supports a single route.
- CEL expressions using `event.type` for CloudEvent attributes and `event.data.<field>` for data envelope fields are confirmed correct per official docs.
- The programmatic subscription JSON structure returned from `/dapr/subscribe` (with `routes.rules` array and `routes.default`) matches the documented format exactly.
- Publishing with `Content-Type: application/cloudevents+json` and a full CloudEvents 1.0 envelope is the correct approach for sending pre-constructed CloudEvents to Dapr.
- Minor observation: the Dapr docs note that `event.data.*` routing only works when the data payload contains nested JSON values, not JSON-escaped strings. The blog omits this caveat, which could be a useful addition in a future update but is not an error.
