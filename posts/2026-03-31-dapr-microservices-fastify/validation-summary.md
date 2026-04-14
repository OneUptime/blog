# Validation Summary: How to Build Microservices with Dapr and Fastify

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Fastify (Node.js web framework)
- @dapr/dapr JavaScript SDK (DaprClient, DaprServer)
- Node.js
- JSON Schema validation

## Sources Consulted
- Dapr JavaScript Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript Server SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr State Management How-To: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr Pub/Sub How-To: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Fastify Plugins documentation: https://fastify.dev/docs/latest/Reference/Plugins/
- Fastify Server Methods documentation: https://fastify.dev/docs/latest/Reference/Server/
- Fastify Validation and Serialization: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/

## Issues Found

1. **DaprClient `daprHost` included protocol prefix**: The `DaprClient` constructor used `daprHost: "http://localhost"`, but the `daprHost` parameter expects a hostname or IP address without a protocol prefix. The protocol is controlled separately via the `communicationProtocol` option. Changed to `daprHost: "127.0.0.1"`.

2. **DaprServer `clientOptions.daprHost` included protocol prefix**: Same issue in the `DaprServer` constructor — `clientOptions.daprHost` was set to `"http://localhost"`. Changed to `daprHost: "127.0.0.1"`.

3. **Top-level `await` in CommonJS module**: The `src/subscriber.js` example used `require()` (CommonJS) but had top-level `await` statements (`await server.pubsub.subscribe(...)` and `await server.start()`). Top-level `await` is only valid in ES modules. Wrapped the async calls in an `async function main()` with a `.catch(console.error)` invocation.

## Review Notes
- The Fastify APIs (plugin registration with prefix, `listen()` signature, JSON Schema validation format) are all correct and current.
- The Dapr state management APIs (`state.save`, `state.get`, `state.delete`) and pub/sub APIs (`pubsub.publish`, `pubsub.subscribe`) are correctly used.
- The `dapr run` CLI command uses correct flags and syntax.
- The `updateInventory` function in the subscriber example is referenced but not defined; this is acceptable for a tutorial snippet illustrating the subscription pattern.
