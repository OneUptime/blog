# Validation Summary: How to Implement Throttling with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr virtual actors
- Dapr JavaScript/Node.js SDK (`@dapr/dapr`)
- Token bucket rate limiting algorithm
- Fixed window rate limiting algorithm
- Express.js middleware

## Sources Consulted
- Dapr JS SDK actor patterns from `posts/2026-03-31-dapr-actors-javascript-sdk/README.md` — defines the correct `AbstractActor` base class, `this.stateManager` usage, and `ActorProxyBuilder` client invocation pattern
- Dapr actor method invocation patterns from `posts/2026-03-31-dapr-invoke-actor-methods/README.md` — confirms HTTP API pattern `POST /v1.0/actors/{actorType}/{actorId}/method/{methodName}` and SDK invocation conventions
- Dapr actor SDK invocation from `posts/2026-03-31-dapr-actor-invocation-sdk/README.md` — confirms `ActorProxyBuilder` accepts a string actor type name, methods receive a single serialized argument, and `ActorId` is required for proxy construction

## Issues Found

1. **Actor classes did not extend `AbstractActor`**: Both `TokenBucketActor` and `FixedWindowActor` were defined as plain classes with a `constructor(host)` pattern that manually assigned `host.stateManager` and `host.id`. In the Dapr JS SDK, actors must extend `AbstractActor` from `@dapr/dapr`, which provides `this.stateManager` automatically. Fixed both classes to extend `AbstractActor` and removed the incorrect constructors. Added the required `require('@dapr/dapr')` import to each actor code block.

2. **`client.actor.invoke()` does not exist in the JS SDK**: The middleware and per-endpoint throttling sections used `client.actor.invoke('ActorType', 'actorId', 'method', body)` which is not a valid API in the `@dapr/dapr` package. The correct pattern is to use `ActorProxyBuilder` to create a proxy, then call methods directly on it. Fixed both sections to use `new ActorProxyBuilder('ActorType', client)` with `builder.build(new ActorId(...))` and direct method calls. Updated the `require` import to include `ActorProxyBuilder` and `ActorId`.

3. **Actor methods accepted multiple parameters instead of a single object**: `checkAndConsume(cost, config)` took two separate parameters and `checkAndIncrement(limit, windowSeconds)` likewise. Dapr's actor proxy serializes the request body as a single JSON argument, so each method should accept one object parameter. Refactored both methods to accept a single `params` object with destructured defaults.

## Review Notes
- The fixed window actor creates a new state key per time window (`window:{timestamp}`) but never cleans up expired window keys. In production, old keys would accumulate in the state store. A timer-based cleanup or TTL on state entries would address this, but it is a design consideration rather than a technical error.
- The token bucket algorithm logic (refill calculation, `retryAfterMs` computation) is correct.
- The `stateManager.get()` fallback pattern using `|| defaultValue` is consistent with other validated Dapr JS SDK posts in this blog.
