# Validation Summary: How to Build an Inventory Management System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model for per-SKU state)
- Dapr Pub/Sub (event-driven reorder triggers)
- Dapr State Management (actor state manager)
- Go (Dapr Go SDK — github.com/dapr/go-sdk)

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk
  - `actor/actor.go` — `ServerImplBase` (deprecated) vs `ServerImplBaseCtx`, `StateManager` vs `StateManagerContext`
  - `client/client.go` — public `InvokeActor` method and `InvokeActorRequest`/`InvokeActorResponse` types
  - `service/common/type.go` — `TopicEvent` struct with `RawData` field
  - `examples/actor/serving/main.go` — official actor implementation example using `ServerImplBaseCtx`
- Dapr Actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Pub/Sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/

## Issues Found

### 1. Deprecated `actor.ServerImplBase` (line 36)
**What was wrong:** The actor struct embedded `actor.ServerImplBase`, which is deprecated in the Dapr Go SDK. Additionally, the state manager calls in the code used `ctx` as the first parameter (e.g., `a.GetStateManager().Get(ctx, "stock", &stock)`), which is only valid with the `StateManagerContext` interface returned by `ServerImplBaseCtx.GetStateManager()`. With the deprecated `ServerImplBase`, `GetStateManager()` returns the old `StateManager` interface whose methods do not accept a context parameter — so the code would not compile.
**What was changed:** Replaced `actor.ServerImplBase` with `actor.ServerImplBaseCtx`.
**Why:** Fixes a compile error and uses the current, non-deprecated API. The official Dapr Go SDK examples use `ServerImplBaseCtx`.

### 2. Non-existent `InvokeActorMethod` on public client (lines 123–146 and 163–170)
**What was wrong:** The blog used `daprClient.InvokeActorMethod(ctx, actorType, actorID, method, data, &response)` which does not exist on the public `dapr.Client` interface. `InvokeActorMethod` is an internal runtime method, not exposed on the client. The correct public API is `daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{...})` which returns `(*dapr.InvokeActorResponse, error)`.
**What was changed:** Rewrote both the Multi-Warehouse Support and Inventory Adjustment API sections to use `daprClient.InvokeActor()` with `dapr.InvokeActorRequest` structs. Request data is now marshaled to JSON bytes for the `Data` field, and responses are unmarshaled from `resp.Data`.
**Why:** The original code would not compile. `InvokeActor` with `InvokeActorRequest` is the correct public client API.

### 3. `checkReorder` defined but never called (line 108)
**What was wrong:** The `checkReorder` method was defined to publish a "reorder-triggered" event when stock falls to or below the reorder point, but it was never called from any actor method. The `Reserve` method reduces `Available` stock and is the natural place to trigger a reorder check.
**What was changed:** Added `a.checkReorder(ctx, stock)` call at the end of the `Reserve` method, after successfully saving the updated stock state.
**Why:** Without this call, the automatic reorder feature described in the blog's Summary section would never actually trigger.

## Review Notes
- The `Release` method does not validate that `stock.Reserved >= req.Qty` before subtracting, which could result in negative reserved values. This is acceptable for a tutorial but would need validation in production code.
- Error returns from `GetStateManager().Get()` are silently ignored in `Reserve`, `Commit`, `Release`, and `Receive` methods. In production, these should be checked.
- The `daprClient` variable used inside actor methods (e.g., in `Receive` and `checkReorder` for `PublishEvent`) is referenced as a package-level global but never declared in the snippets. This is typical for blog code but readers should note they need to initialize this client.
- The `PublishEvent` call signature `daprClient.PublishEvent(ctx, pubsubName, topicName, data)` is correct for the Dapr Go SDK client.
- The pub/sub handler return type `(bool, error)` is correct — `false, nil` means success (no retry).
- `r.PathValue("sku")` requires Go 1.22+ with the new `net/http` routing patterns.
