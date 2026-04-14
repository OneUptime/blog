# Validation Summary: How to Implement Finite State Machine with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (JavaScript/Node.js SDK)
- Dapr State Management
- Finite State Machines
- Node.js / Express HTTP endpoints
- TypeScript (interface definition)

## Sources Consulted
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-actors/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr JS SDK GitHub repository: https://github.com/dapr/js-sdk
- Dapr docs issue #2582 (documenting outdated JS SDK actor examples): https://github.com/dapr/docs/issues/2582
- @dapr/dapr npm package: https://www.npmjs.com/package/@dapr/dapr

## Issues Found

1. **Actor class did not extend AbstractActor**: The original code used a plain class with a `constructor(host)` pattern and accessed state via `host.stateManager`. In the Dapr JS SDK, actor classes must extend `AbstractActor` from `@dapr/dapr`. Fixed the class to `class OrderFSMActor extends AbstractActor` and added the required import.

2. **Incorrect state manager access pattern**: The original code used `this.stateManager.get()` and `this.stateManager.set()`. The correct Dapr JS SDK pattern is `this.getStateManager().getState()` and `this.getStateManager().setState()`. Fixed all state manager calls throughout the actor implementation.

3. **Incorrect actor ID access**: The original code used `this.host.id` to access the actor's identity. The correct pattern in the Dapr JS SDK is `this.getId().getId()`, where `getId()` returns an `ActorId` object and the second `.getId()` extracts the string value. Fixed in the `onTransition` method.

4. **Missing ActorId in client invocation**: The `client.actor.invoke()` call passed a raw string for the actor ID. The Dapr JS SDK expects an `ActorId` object. Added `ActorId` to the import and wrapped actor IDs with `new ActorId(...)`.

5. **State diagram incomplete**: The ASCII diagram only showed `confirmed -> cancelled` but the transition table also allows `draft -> cancelled`. Fixed the diagram to show both cancel paths.

## Review Notes
- The Dapr HTTP API endpoints for invoking actor methods (`/v1.0/actors/<type>/<id>/method/<method>`) are correct.
- The `@dapr/dapr` package name and `DaprClient` import are correct and current.
- The conceptual explanation of Dapr actors providing turn-based concurrency and durable state for FSMs is accurate.
- The comment about atomic state saves was clarified: Dapr commits all state changes atomically at the end of the actor turn, not on each individual `setState` call.
- The `|| 'draft'` fallback pattern for initial state assumes `getState()` returns a falsy value for missing keys. In practice, behavior may vary — using `containsState()` before `getState()` would be more robust, but the current pattern is acceptable for a tutorial.
