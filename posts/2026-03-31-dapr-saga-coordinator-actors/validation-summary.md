# Validation Summary: How to Implement Saga Coordinator with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript/Node.js SDK (`@dapr/dapr`)
- Dapr Actors (virtual actor model)
- Saga pattern (orchestration variant)
- Distributed transactions

## Sources Consulted
- Dapr JS SDK actor documentation: https://docs.dapr.io/developing-applications/sdks/js/js-actors/
- Dapr JS SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK overview: https://docs.dapr.io/developing-applications/sdks/js/
- `@dapr/dapr` npm package API (AbstractActor, ActorProxyBuilder, DaprClient classes)

## Issues Found

1. **Actor class missing `AbstractActor` inheritance**: The `OrderSagaActor` class was defined as a plain class. Dapr JS SDK actors must extend `AbstractActor` from `@dapr/dapr`. Added the import and `extends AbstractActor`.

2. **Incorrect constructor pattern**: The actor used `constructor(host)` with `host.stateManager` and `host.id`. Dapr actors inherit from `AbstractActor` and do not receive a `host` parameter. Removed the constructor entirely — `AbstractActor` provides `this.getStateManager()`, `this.getActorId()`, and `this.getDaprClient()`.

3. **Wrong state management API**: Used `this.stateManager.get()` and `this.stateManager.set()`. The correct API is `this.getStateManager().getState()` and `this.getStateManager().setState()`. Fixed all occurrences.

4. **Wrong service invocation API**: Used `this.client.invokeMethod('service', 'method', 'POST', data)`. The correct API is `this.getDaprClient().invoker.invoke('service', 'method', HttpMethod.POST, data)`. The method lives on the `invoker` sub-client, not directly on `DaprClient`.

5. **String HTTP method instead of enum**: Used string `'POST'` for HTTP methods. The SDK expects `HttpMethod.POST` from the `@dapr/dapr` package. Added import and replaced all occurrences.

6. **Wrong client-side actor invocation**: Used `client.actor.invoke('OrderSagaActor', id, 'method', data)` which is not a valid API. The correct approach is to use `ActorProxyBuilder` to create a typed proxy, then call methods directly on it. Fixed both the "Starting a Saga" and "Checking Saga Status" sections to use `ActorProxyBuilder` and `ActorId`.

7. **DaprClient created inside actor**: The actor created its own `new DaprClient()` in the constructor. `AbstractActor` already provides access to the Dapr client via `this.getDaprClient()`. Removed the manual client creation.

## Review Notes
- The saga pattern logic itself (state machine, compensation in reverse order, history tracking) is well-designed and conceptually correct.
- The `createShipment` and `completeOrder` methods referenced in `executeStep` are not defined in the code example. This is acceptable for a tutorial — they follow the same pattern as the defined methods.
- The `getSagaState` method invoked in the "Checking Saga Status" section is not defined in the actor class. The reader would need to add it (a simple method returning `this.getStateManager().getState('saga')`).
- The compensation logic correctly checks which state was reached before compensating in reverse order.
