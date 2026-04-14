# Validation Summary: How to Implement Actor State Snapshots in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`) v1.14.x
- Dapr Virtual Actors
- Dapr Actor State Management
- Dapr Actor Timers
- Go (Golang)

## Sources Consulted
- Dapr Go SDK actor package API reference: https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Go SDK client package API reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK source code (actor package): https://github.com/dapr/go-sdk/blob/main/actor/actor.go
- Dapr Go SDK source code (client actor types): https://github.com/dapr/go-sdk/blob/main/client/actor.go
- Dapr Go SDK official actor example: https://github.com/dapr/go-sdk/tree/main/examples/actor
- Dapr actor documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/howto-actors/

## Issues Found

### 1. Unused `encoding/json` import (compile error)
**What was wrong:** The first code block imported `encoding/json` but never used it. In Go, unused imports are compile errors.
**What was changed:** Removed the `encoding/json` import from the first code block.

### 2. `OnActivate` lifecycle hook does not exist in the Dapr Go SDK
**What was wrong:** The original code implemented an `OnActivate(ctx context.Context) error` method, implying it would be called automatically when the actor is activated. The Dapr Go SDK's `ServerContext` interface has no `OnActivate` lifecycle hook — this method would compile but never be called by the runtime, so the snapshot would never be loaded.
**What was changed:** Replaced `OnActivate` with a `loadSnapshot` method using a lazy-loading pattern (guarded by `a.state != nil` check). Each actor method that accesses state calls `loadSnapshot` at the start. Added comments explaining the Go SDK limitation.

### 3. `OnDeactivate` lifecycle hook does not exist in the Dapr Go SDK
**What was wrong:** The original code implemented `OnDeactivate() error` to save dirty state on actor deactivation. The Go SDK's `DeactivateActor` in the actor manager simply removes the actor from the active map without calling any user-defined deactivation method. This method would never execute.
**What was changed:** Removed the `OnDeactivate` method entirely. The timer-based periodic snapshot approach (already in the post) is the correct way to ensure dirty state is persisted.

### 4. `isNotFound(err)` function does not exist
**What was wrong:** The original code used `isNotFound(err)` to check if a state key was missing. No such function exists in the Dapr Go SDK. The SDK does not use typed errors for missing keys, so string-matching on error messages would be fragile.
**What was changed:** Replaced with the `StateManagerContext.Contains()` method, which is the idiomatic way to check key existence in the Dapr Go SDK before calling `Get`.

### 5. `a.RegisterActorTimer()` is not a method on the actor base struct
**What was wrong:** The original code called `a.RegisterActorTimer(ctx, &actor.RegisterTimerRequest{...})`. `RegisterActorTimer` is a method on the Dapr client (`client.Client`), not on `ServerImplBaseCtx`. Additionally, `actor.RegisterTimerRequest` does not exist — the correct type is `client.RegisterActorTimerRequest`.
**What was changed:** Updated the actor struct to hold a `daprClient client.Client` field. Changed the timer registration call to `a.daprClient.RegisterActorTimer(ctx, &client.RegisterActorTimerRequest{...})`.

### 6. Benchmark referenced removed `OnActivate` method
**What was wrong:** The benchmark code called `actor.OnActivate(context.Background())` which referenced the now-removed lifecycle method.
**What was changed:** Updated to call `a.loadSnapshot(context.Background())` to match the corrected API.

## Review Notes
- The core concept of the post (aggregating actor state into a single snapshot key to reduce read overhead) is sound and well-explained.
- The `json.Unmarshal` calls in the versioning section ignore their error return values. This is acceptable for a tutorial snippet but would not be appropriate for production code.
- The `Item` type referenced in the first code block is undefined — this is acceptable for a conceptual snippet.
- Unlike the .NET and Java Dapr SDKs (which have `OnActivateAsync`/`OnDeactivateAsync`), the Go SDK does not provide automatic actor lifecycle callbacks. This is a significant API difference that Go developers should be aware of when porting patterns from other SDK documentation.
- The `client.RegisterActorTimerRequest` struct also supports a `TTL` field and a `Data` field (for passing data to the callback), which could be useful additions in a more advanced tutorial.
