# Validation Summary: How to Use Dapr Service Invocation for Synchronous Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Service Invocation, Pub/Sub, Resiliency)
- Node.js / Express
- Axios (HTTP client)
- JavaScript (async/await, Promise.all)

## Sources Consulted
- Dapr Service Invocation HTTP API documentation (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/)
- Dapr Resiliency policies documentation (https://docs.dapr.io/operations/resiliency/policies/)
- Dapr Pub/Sub API documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr JavaScript SDK documentation (https://docs.dapr.io/developing-applications/sdks/js/)

## Issues Found
1. **Missing `axios` import in first code example**: The "Setting Up a Synchronous Service" code block imported `express` and used `axios.get()` but never imported axios. This would cause a `ReferenceError` at runtime. Added `const axios = require('axios');` after the express import.

## Review Notes
- The Dapr HTTP invocation URL format `http://localhost:3500/v1.0/invoke/{app-id}/method/{method-name}` is correct for the Dapr sidecar HTTP API.
- The Resiliency YAML spec uses the correct `apiVersion: dapr.io/v1alpha1`, `kind: Resiliency`, and valid policy/target structure.
- The second code example (checkout function) and the parallel vs sequential snippet are standalone functions/pseudocode and do not include imports, which is acceptable for illustrative snippets.
- The async conversion example uses `daprClient.pubsub.publish(pubsubName, topicName, data)` which matches the Dapr JS SDK API.
- The guidance on when to use synchronous vs asynchronous patterns is sound and aligns with Dapr best practices.
