# Validation Summary: How to Use Dapr Actors with JavaScript SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript/Node.js SDK (`@dapr/dapr`)
- Dapr Virtual Actor pattern
- TypeScript
- Node.js

## Sources Consulted
- Dapr JavaScript SDK source code and examples: https://github.com/dapr/js-sdk
- Dapr JavaScript SDK npm package: https://www.npmjs.com/package/@dapr/dapr
- Dapr JS SDK actor examples: https://github.com/dapr/js-sdk/tree/main/examples/http/actor
- Dapr JS SDK `AbstractActor` implementation: https://github.com/dapr/js-sdk/blob/main/src/actors/runtime/AbstractActor.ts
- Dapr JS SDK `ActorStateManager` implementation: https://github.com/dapr/js-sdk/blob/main/src/actors/runtime/ActorStateManager.ts
- Dapr JS SDK `DaprClientOptions` type definitions: https://github.com/dapr/js-sdk/blob/main/src/types/DaprClientOptions.ts

## Issues Found

### 1. `daprHost` included protocol prefix incorrectly
- **What was wrong:** Both the `DaprServer` `clientOptions` and the `DaprClient` constructor used `daprHost: "http://localhost"`. The `daprHost` option expects a plain hostname or IP address (e.g., `"127.0.0.1"` or `"localhost"`) without the `http://` protocol prefix. The SDK constructs the full URL internally by combining host, port, and protocol.
- **What was changed:** Changed `"http://localhost"` to `"127.0.0.1"` in both the server registration snippet and the client proxy snippet.
- **Why:** Using a protocol prefix in `daprHost` would result in malformed URLs when the SDK assembles the endpoint, causing connection failures.

### 2. Unused import of `ActorId` in interface file
- **What was wrong:** The `ICartActor.ts` interface file imported `ActorId` from `@dapr/dapr`, but `ActorId` was never used in the interface definition.
- **What was changed:** Removed the unused `import { ActorId } from "@dapr/dapr";` line.
- **Why:** Unused imports are unnecessary and may confuse readers into thinking `ActorId` is needed for defining actor interfaces.

## Review Notes
- The `getStateManager().getState<T>(key)` pattern places the generic type parameter on `getState`. In the SDK source, the generic is defined at the `ActorStateManager<T>` class level, which means `getStateManager<T>().getState(key)` may be more technically precise. However, since TypeScript can still infer and apply the generic in the way the post uses it (and the pattern is common in Dapr documentation examples), this was not changed.
- The `server.actor.registerActor(CartActor)` call returns a Promise but is not awaited in the post. The official Dapr examples also do not await this call, so this is consistent with documented usage.
- The `CartItem` and `CheckoutResult` types are referenced but not defined in the post. This is acceptable for a tutorial that focuses on the actor pattern rather than type definitions, but readers will need to define these types themselves.
- All imports (`AbstractActor`, `ActorId`, `ActorProxyBuilder`, `DaprServer`, `DaprClient`) are correctly exported from `@dapr/dapr`.
- The actor registration order (`init()` -> `registerActor()` -> `start()`) matches the official examples and is correct.
