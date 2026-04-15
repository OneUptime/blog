# Validation Summary: How to Build Dapr Actors with JavaScript SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- @dapr/dapr Node.js SDK
- JavaScript / Node.js
- Dapr Virtual Actors
- Dapr State Management

## Sources Consulted
- @dapr/dapr npm package (v3.6.1) — https://www.npmjs.com/package/@dapr/dapr
- Dapr JS SDK source code (AbstractActor, ActorStateManager, DaprServer, ActorProxyBuilder classes)
- Dapr official documentation — https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Actors documentation — https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Configuration spec — https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. Incorrect state manager access pattern (Critical)
**What was wrong:** The post used `this.stateManager.get()` and `this.stateManager.set()` throughout the actor implementation. The `stateManager` field is private on `AbstractActor` and cannot be accessed directly by subclasses.
**What was changed:** Replaced all occurrences with `this.getStateManager()`, which is the correct public accessor method.

### 2. Wrong method names on ActorStateManager (Critical)
**What was wrong:** The post used `.get('items')` and `.set('items', value)`. The `ActorStateManager` class does not have `get()` or `set()` methods.
**What was changed:** Replaced `.get()` with `.getOrAddState()` and `.set()` with `.setState()`, which are the actual method names on `ActorStateManager`.

### 3. Incorrect handling of missing state keys (Critical)
**What was wrong:** The post used `await this.stateManager.get('items') || []` assuming that accessing a non-existent key returns null/undefined. In reality, `getState()` throws an error when the key does not exist.
**What was changed:** Replaced the `|| []` fallback pattern with `getOrAddState('items', [])`, which safely returns the existing value or initializes it with the provided default.

### 4. Missing await on registerActor (Minor)
**What was wrong:** `server.actor.registerActor(ShoppingCartActor)` was called without `await`. The method signature returns `Promise<void>`.
**What was changed:** Added `await` before the call.

### 5. Incorrect actor configuration YAML (Critical)
**What was wrong:** The post showed actor runtime settings (`idleTimeout`, `scanInterval`, `drainOngoingCallTimeout`) under a `spec.actors` section in a Dapr Configuration YAML resource. This section does not exist in the Dapr Configuration spec. Additionally, the field names were wrong (`idleTimeout` instead of `actorIdleTimeout`, `scanInterval` instead of `actorScanInterval`).
**What was changed:** Replaced the YAML-based actor config with the correct SDK-based approach — passing actor options through `DaprServer`'s `clientOptions.actor` object. Kept the `features` YAML section (for ActorStateTTL) as a separate, correctly-scoped Configuration resource.

### 6. Summary section referenced incorrect API
**What was wrong:** The summary mentioned `this.stateManager` as the state access pattern.
**What was changed:** Updated to `this.getStateManager()`.

## Review Notes
- The `AbstractActor`, `ActorProxyBuilder`, `ActorId`, `DaprClient`, `DaprServer`, and `CommunicationProtocolEnum` exports are all correctly imported from `@dapr/dapr`.
- The `DaprServer` constructor options object pattern and the `init()` -> `registerActor()` -> `start()` sequence are correct.
- The `ActorProxyBuilder` proxy pattern (calling methods directly on the proxy object) is correct — it uses JavaScript `Proxy` under the hood to intercept calls and forward them via the Dapr actor invocation API.
- The `dapr run` CLI command syntax is correct.
- The section heading "Hosting the Actor in an Express Service" is slightly misleading since the code uses `DaprServer` (not Express directly), but `DaprServer` does use Express internally, so this is acceptable.
