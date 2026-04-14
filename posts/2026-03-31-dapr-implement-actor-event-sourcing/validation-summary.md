# Validation Summary: How to Implement Actor Event Sourcing in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Dapr Actor State Management (`ServerImplBaseCtx`, `StateManagerContext`)
- Event Sourcing pattern
- Go programming language

## Sources Consulted
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK actor package: https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Go SDK GitHub repository: https://github.com/dapr/go-sdk
- Internal validated blog posts: `dapr-virtual-actor-model`, `dapr-manage-actor-state` (confirmed `OnActivate` does not exist in the Go SDK)

## Issues Found

### Issue 1: `OnActivate` lifecycle method does not exist in Dapr Go SDK (Critical)
- **What was wrong:** The post defined `func (a *OrderActor) OnActivate(ctx context.Context) error` and presented it as an activation lifecycle hook that Dapr calls automatically when an actor is activated. The Dapr Go SDK does not expose a user-overridable activation callback. This method would compile but never be called by Dapr, meaning event replay would never occur and the actor would always start with empty state.
- **What was changed:** Replaced `OnActivate` with an `ensureStateLoaded` lazy-initialization helper method that includes a guard (`if a.version > 0`) to skip redundant loads. Added an explanatory note that the Dapr Go SDK lacks an activation lifecycle hook. Updated `CreateOrder`, `PayOrder`, and `GetEventHistory` methods to call `ensureStateLoaded(ctx)` at the start to ensure events are replayed before state is accessed.
- **Why:** Without this fix, the core promise of the post (reconstructing state from events on activation) would silently fail. The lazy-initialization pattern is the standard workaround in the Dapr Go SDK.

## Review Notes
- All other API usage is correct: `actor.ServerImplBaseCtx` is the current (non-deprecated) base struct, `GetStateManager()` returns a `StateManagerContext` with the correct `Set(ctx, key, value)` and `Get(ctx, key, &value)` signatures, `ID()` and `Type()` methods exist as shown.
- The `Item` and `CreateOrderInput` types are referenced but not defined in the code snippets. This is acceptable for a tutorial that focuses on the event sourcing pattern rather than full compilation.
- The snapshotting section describes the concept but does not show the corresponding activation-time logic to load a snapshot before replaying. This is noted as guidance ("On activation, load the snapshot first...") and is adequate for the scope of the post.
- The `saveCurrentVersion` method ignores the error from `Set()`. This is a minor code quality issue but not a technical inaccuracy for a tutorial context.
