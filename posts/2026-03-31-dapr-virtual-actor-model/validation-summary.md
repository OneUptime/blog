# Validation Summary: How to Understand the Virtual Actor Model in Dapr

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (Virtual Actor Model)
- Dapr Go SDK
- Dapr Placement Service
- Dapr Actor State Management API

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK actors documentation: https://docs.dapr.io/developing-applications/sdks/go/go-actors/
- Dapr Go SDK source (actor interfaces: `ServerContext`, `ServerImplBaseCtx`, `StateManagerContext`)

## Issues Found

### 1. Incorrect `OnActivateAsync` callback reference (was line 40)
**What was wrong:** The activation steps referenced `OnActivateAsync` as the callback Dapr invokes when activating an actor. `OnActivateAsync` is a .NET SDK concept (inherited from Orleans). The post uses Go code examples throughout, and the Dapr Go SDK does not expose a user-overridable activation callback.
**What was changed:** Replaced "Dapr calls the `OnActivateAsync` callback on the hosting instance" with "Dapr activates it on the hosting instance" to be accurate and language-agnostic.

### 2. Non-existent `OnActivate()` Go method (was lines 46-51)
**What was wrong:** The post included a Go code example defining `func (a *CounterActor) OnActivate() error`. This method does not exist in the Dapr Go SDK's actor interfaces (`ServerContext`, `Server`, `ServerImplBaseCtx`). A search of the dapr/go-sdk repository confirmed zero matches for `OnActivate`. This code would compile but never be called by Dapr, making it misleading.
**What was changed:** Removed the entire `OnActivate` code block since it demonstrated a non-functional pattern.

### 3. Misleading state loading claim (was line 41)
**What was wrong:** Step 3 stated "State is loaded from the configured state store" as a distinct activation step, implying bulk state loading during activation. In the Dapr Go SDK, state is accessed on-demand via `stateManager.Get()` calls during method execution, not pre-loaded at activation time.
**What was changed:** Merged the state access into the method execution step: "The method executes, accessing state on demand from the configured state store." This accurately reflects that state retrieval happens during method execution, not as a separate activation phase.

## Review Notes
- The `stateManager.Get/Set` API usage in the `Increment` method example is correct and matches the `StateManagerContext` interface signatures in the Dapr Go SDK.
- The actor invocation HTTP API endpoint pattern (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is correct per the official Dapr API reference.
- Turn-based concurrency description is accurate — Dapr acquires a per-actor lock at the beginning of each turn and releases it at the end.
- The current Go SDK recommends using `GetStateManager()` method rather than accessing `stateManager` as a direct field. The code example works but uses an older access pattern.
- The post correctly attributes the virtual actor model to Microsoft's Orleans project.
