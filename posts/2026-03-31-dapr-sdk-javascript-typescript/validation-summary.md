# Validation Summary: How to Use Dapr SDK for JavaScript/TypeScript to Build Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- `@dapr/dapr` JavaScript/TypeScript SDK
- Node.js / TypeScript
- Redis (state store and pub/sub component)
- gRPC and HTTP communication protocols
- Dapr Actors

## Sources Consulted
- Official Dapr JS SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr JS SDK GitHub repository and source code: https://github.com/dapr/js-sdk
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/

## Issues Found

### 1. Non-existent `state.saveBulk` method
- **What was wrong:** Step 4 used `client.state.saveBulk("statestore", [...])`. The `saveBulk` method does not exist on the Dapr JS SDK state client.
- **What was changed:** Replaced `saveBulk` with `save`, which already accepts an array of key-value pairs and handles bulk saves natively.
- **Why:** The `save` method signature is `save(storeName: string, stateObjects: KeyValuePairType[])` — the array parameter makes it inherently a bulk operation.

### 2. Service invocation used string instead of `HttpMethod` enum
- **What was wrong:** Step 1 used the string literal `"POST"` as the third argument to `client.invoker.invoke()`.
- **What was changed:** Added `HttpMethod` to the import statement and replaced `"POST"` with `HttpMethod.POST`.
- **Why:** The `invoke` method expects an `HttpMethod` enum value, not a raw string. Using the enum ensures type safety and compatibility with the SDK's type system.

### 3. `ActorProxyBuilder` received a string instead of a class
- **What was wrong:** Step 5 passed the string `"OrderActor"` as the first argument to `new ActorProxyBuilder<OrderActorInterface>("OrderActor", client)`.
- **What was changed:** Added an `OrderActor` class implementing the interface, and passed the class reference instead of the string: `new ActorProxyBuilder<OrderActorInterface>(OrderActor, client)`.
- **Why:** The `ActorProxyBuilder` constructor requires a class reference (`Class<T>`, i.e., a constructor function), not a string type name. The SDK uses the class to create the proxy.

## Review Notes
- The `DaprClient` and `DaprServer` constructor patterns, state get/save/transaction, pub/sub, secrets, and gRPC configuration are all correct.
- The Dapr component YAML files use the correct `redisHost` metadata field name and format.
- The `state.getBulk` result correctly references `.key` and `.data` properties (not `.value`).
- The `dapr run` CLI command and flags are correct.
- The architecture diagram accurately represents the Dapr sidecar pattern.
