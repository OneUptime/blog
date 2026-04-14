# Validation Summary: How to Implement Request-Reply Patterns with Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, pub/sub building blocks)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js / Express
- Axios HTTP client
- AbortController (Web API / Node.js)

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr JavaScript SDK documentation (DaprClient vs DaprServer usage)
- Axios documentation (AbortController support and error codes)

## Issues Found
1. **Pub/Sub subscribe used `daprClient` instead of `daprServer`**: In the "Async Request-Reply via Pub/Sub" section, the code used `daprClient.pubsub.subscribe(...)` for subscribing to a topic. In the Dapr JS SDK, `DaprClient` handles outbound communication (publishing, invoking), while `DaprServer` handles inbound communication (subscriptions, bindings). Changed `daprClient` to `daprServer` and added a clarifying comment.

## Review Notes
- The Dapr service invocation URL format (`http://localhost:3500/v1.0/invoke/{appId}/method/{methodName}`) is correct and current.
- Default Dapr HTTP sidecar port 3500 is correct.
- Custom headers like `X-Correlation-ID` are correctly propagated through Dapr service invocation calls.
- The Axios AbortController timeout pattern and `ERR_CANCELED` error code check are correct and use the modern (non-deprecated) API.
- The async request-reply via pub/sub section demonstrates a conceptual pattern; in practice, dynamic per-client topic subscriptions at runtime may require additional considerations depending on the pub/sub component used.
