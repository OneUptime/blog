# Validation Summary: How to Handle Actor State Migration in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Dapr Actor State Management (`ServerImplBaseCtx`, `StateManagerContext`)
- Dapr Actor HTTP Invocation API
- Go programming language
- JSON schema versioning and migration patterns

## Sources Consulted
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK actor package: https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Go SDK GitHub repository: https://github.com/dapr/go-sdk
- Internal validated blog posts: `dapr-implement-actor-event-sourcing`, `dapr-virtual-actor-model` (confirmed `OnActivate` does not exist in the Go SDK and established the lazy-initialization fix pattern)

## Issues Found

### Issue 1: `OnActivate` lifecycle method does not exist in Dapr Go SDK (Critical)
- **What was wrong:** The post defined `func (a *OrderActor) OnActivate(ctx context.Context) error` and presented it as an activation lifecycle hook that Dapr calls automatically when an actor is activated. The Dapr Go SDK does not expose a user-overridable activation callback (unlike the .NET SDK's `OnActivateAsync`). This method would compile but never be called by Dapr, meaning state migration would never occur and the actor would always start with empty/stale state.
- **What was changed:** Replaced `OnActivate` with an `ensureStateLoaded` lazy-initialization helper method that includes a `loaded` boolean guard to skip redundant loads. Added a `loaded` field to the `OrderActor` struct. Added an explanatory note that the Dapr Go SDK lacks an activation lifecycle hook. Updated `GetOrder` and `UpdateOrder` methods to call `ensureStateLoaded(ctx)` at the start to ensure state is loaded and migrated before access. Updated the section title from "Migration Logic in OnActivate" to "Migration Logic with Lazy Initialization". Updated the Summary to reference the lazy-initialization pattern instead of `OnActivate`.
- **Why:** Without this fix, the core promise of the post (migrating state on activation) would silently fail. The lazy-initialization pattern is the standard workaround in the Dapr Go SDK, consistent with fixes applied to other validated posts in this blog.

## Review Notes
- All other API usage is correct: `actor.ServerImplBaseCtx` is the current (non-deprecated) base struct, `GetStateManager()` returns a `StateManagerContext` with the correct `Set(ctx, key, value)` and `Get(ctx, key, &value)` signatures.
- The actor HTTP invocation URL format `http://localhost:3500/v1.0/actors/{actorType}/{actorId}/method/{methodName}` is correct per the Dapr Actors API reference.
- The `VersionedState` wrapper pattern with `json.RawMessage` for the data field is a sound approach for versioned state schemas in Go.
- The `json.Unmarshal` calls in `ensureStateLoaded` ignore errors. This is a minor code quality concern but acceptable in a tutorial context focused on the migration pattern rather than production error handling.
- The `json.Marshal` call in `saveState` also ignores errors (assigned to `_`). Same assessment as above.
- The `OrderUpdate` type is referenced but not defined in the code snippets. This is acceptable for a tutorial that focuses on the migration pattern.
- The bulk migration script uses `http.Post` without checking errors, which is fine for illustrative purposes.
- The `omitempty` section for backward-compatible field additions is technically correct and good advice.
- The test example is straightforward and correct.
