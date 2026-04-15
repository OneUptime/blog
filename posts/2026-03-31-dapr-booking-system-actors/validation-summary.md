# Validation Summary: How to Build a Booking System with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (Virtual Actor model)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Go (Golang)
- State management via Dapr actor state
- Dapr actor timers

## Sources Consulted
- Dapr Go SDK actor package API (`github.com/dapr/go-sdk/actor`) — verified `ServerImplBaseCtx` as the current non-deprecated base struct, `StateManager` interface methods (`Get`, `Set`, `Remove`, `Contains`)
- Dapr Go SDK client package API (`github.com/dapr/go-sdk/client`) — verified `InvokeActor` method with `InvokeActorRequest`/`InvokeActorResponse`, `RegisterActorTimer` with `RegisterActorTimerRequest`
- Previously validated Dapr blog posts in this repository (`dapr-go-actors`, `dapr-actor-shopping-cart`) — cross-referenced correct API patterns
- Dapr actor timers documentation — verified timer registration via Dapr client API with `RegisterActorTimerRequest` struct fields

## Issues Found

1. **Deprecated `actor.ServerImplBase`**: The actor struct embedded `actor.ServerImplBase`, which is deprecated. Changed to `actor.ServerImplBaseCtx`, which is the current base struct for actors that support context-aware methods.

2. **Non-existent timer registration API on StateManager**: The code used `a.GetStateManager().RegisterActorTimer(ctx, &actor.TimerConfig{...})` — neither `RegisterActorTimer` exists on the `StateManager` interface nor does the `actor.TimerConfig` struct exist. The `StateManager` only provides `Get`, `Set`, `Remove`, and `Contains` methods. Replaced with the correct Dapr client API: `daprClient.RegisterActorTimer(ctx, &dapr.RegisterActorTimerRequest{...})` with proper fields (`ActorType`, `ActorID`, `Name`, `DueTime`, `Period`, `Callback`, `Data`).

3. **Non-existent `InvokeActorMethod` on Dapr client**: The code used `daprClient.InvokeActorMethod(ctx, actorType, actorID, method, req, &resp)` which does not exist in the Dapr Go SDK. The correct method is `daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{...})` which returns `(*dapr.InvokeActorResponse, error)`. The request data must be marshaled to `[]byte` and the response data is returned as `[]byte`.

## Review Notes
- The `encoding/json` import in the first code block is not used within that block (struct tags don't require the import), but since blog snippets are meant to be combined into one file, this is acceptable presentation.
- The `timesOverlap` function logic is correct — it properly detects overlapping time intervals using the standard `start1 < end2 && start2 < end1` approach.
- The actor model concepts (turn-based serialization, state persistence, actor activation on demand) are accurately described.
- The hold-and-confirm booking pattern with automatic expiry is a sound architectural approach for reservation systems.
- The actor ID composition (`date-resourceId`) is a reasonable partitioning strategy for booking resources.
