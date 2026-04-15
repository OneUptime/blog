# Validation Summary: How to Implement Command Pattern with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, pub/sub, state management APIs)
- TypeScript
- Express.js
- Command design pattern
- CQRS / microservices messaging
- CloudEvents

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Service Invocation overview (mTLS, retries): https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Security concepts (mTLS): https://docs.dapr.io/concepts/security-concept/
- Dapr Resiliency / retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/

## Issues Found
1. **Fabricated `dapr-pubsub-eventtype` header in pub/sub publish code.** The header `dapr-pubsub-eventtype` does not exist in Dapr's pub/sub publish API. Dapr would silently ignore it and the CloudEvent `type` field would default to `com.dapr.event.sent` instead of being set to the command type as intended. **Fix:** Replaced the fabricated header with the correct `metadata.cloudevent.type` query parameter on the publish URL (e.g., `?metadata.cloudevent.type=${command.commandType}`), and removed the non-existent header from the headers object.

## Review Notes
- The claim that "Dapr service invocation handles synchronous commands with retries and mTLS" is technically accurate but slightly imprecise. Dapr's built-in retries (3 attempts, 1-second backoff) target sidecar connectivity failures, not application-level errors (e.g., HTTP 500). Application-level retry behavior requires explicit resiliency policies. The statement is not incorrect, but readers may overestimate the scope of automatic retries.
- The `saveOrder` function is referenced but not defined. This is acceptable for a tutorial (it is clearly a placeholder), but could confuse beginners.
- The `Item` type used in `sendCreateOrderCommand` is not defined in the post. Minor omission, not a technical error.
- All Dapr HTTP API endpoints (state store, service invocation, pub/sub) use correct URL patterns and body formats.
- The TypeScript interfaces and Express handler code are syntactically correct and idiomatic.
