# Validation Summary: How to Implement Actor Pipelines in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Virtual Actors
- Dapr Pub/Sub
- Dapr Service Invocation
- Node.js

## Sources Consulted
- Dapr JavaScript SDK documentation and validated patterns from other blog posts in this repository
- `@dapr/dapr` npm package API: `AbstractActor`, `ActorProxyBuilder`, `ActorId`, `DaprClient`, `HttpMethod`
- Dapr Actors building block documentation (https://docs.dapr.io/developing-applications/building-blocks/actors/)
- Dapr Service Invocation documentation (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/)
- Dapr Pub/Sub documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)

## Issues Found

### 1. Non-existent `client.actor.invoke()` API (all actor stages + pipeline entry point)
**What was wrong:** All code examples used `client.actor.invoke('ActorType', actorId, 'methodName', data)` to invoke actors. This method does not exist in the `@dapr/dapr` JavaScript SDK.
**What was changed:** Replaced all instances with the correct `ActorProxyBuilder` pattern: create a builder with the actor type, build a proxy with an `ActorId`, then call the method directly on the proxy.
**Why:** The Dapr JS SDK uses a proxy-based pattern for actor invocation, not a direct `invoke` method on the client.

### 2. Non-existent `client.invokeMethod()` API (EnrichmentActor)
**What was wrong:** The EnrichmentActor used `this.client.invokeMethod('user-service', 'users/' + payload.userId, 'GET')` for service invocation. This method does not exist in the JS SDK.
**What was changed:** Replaced with `client.invoker.invoke('user-service', 'users/' + payload.userId, HttpMethod.GET)` using the correct `client.invoker.invoke()` API with the `HttpMethod` enum.
**Why:** The JS SDK exposes service invocation through `client.invoker.invoke()`, not `client.invokeMethod()`.

### 3. Incorrect actor class structure (all actor classes)
**What was wrong:** Actor classes were plain classes with a `constructor(host)` parameter and accessed state via `host.stateManager`. This is not how the Dapr JS SDK works.
**What was changed:** All actor classes now extend `AbstractActor` from `@dapr/dapr`. The `host` constructor pattern was removed. State access (if needed) would use `this.getStateManager()`.
**Why:** The Dapr JS SDK requires actors to extend `AbstractActor`. The framework handles instantiation and provides state management through inherited methods.

### 4. Missing imports
**What was wrong:** No code examples included the required imports from `@dapr/dapr`.
**What was changed:** Added proper `require('@dapr/dapr')` imports to each code block, importing `AbstractActor`, `ActorProxyBuilder`, `ActorId`, `DaprClient`, and `HttpMethod` as needed.
**Why:** Each code block should be self-contained enough to show readers what needs to be imported.

## Review Notes
- The `client.pubsub.publish()` API usage in the ValidationActor was correct and required no changes.
- The overall architectural pattern (actors as pipeline stages with unique IDs per event) is sound and well-explained.
- The StorageActor references an undefined `db` variable, but this is acceptable as a simplified example — readers would understand they need to supply their own database client.
- Creating a new `DaprClient()` inside each actor method call is acceptable for tutorial clarity, but in production code it would be better to share a single client instance.
