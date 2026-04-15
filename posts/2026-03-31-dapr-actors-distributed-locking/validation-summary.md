# Validation Summary: How to Use Dapr Actors for Distributed Locking Patterns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actors (virtual actor model)
- Dapr Actor HTTP API
- Go (Golang)

## Sources Consulted
- Dapr Go SDK actor package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Go SDK client package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors Overview (concurrency model): https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK examples on GitHub: https://github.com/dapr/go-sdk/tree/main/examples/actor

## Issues Found

1. **Deprecated `actor.ServerImplBase` struct** (line 41): The blog post embedded `actor.ServerImplBase`, which is deprecated in the current Dapr Go SDK. The code already used context-aware state manager calls (passing `ctx` to `GetStateManager().Get()` and `Set()`), which require `StateManagerContext` — the interface returned by `ServerImplBaseCtx.GetStateManager()`, not the non-context `StateManager` returned by the deprecated `ServerImplBase.GetStateManager()`. Changed to `actor.ServerImplBaseCtx` to match the context-aware usage pattern throughout the code.

## Review Notes
- The turn-based concurrency claim is accurate per official Dapr documentation — the runtime acquires a per-actor lock for each method invocation.
- The TTL value `30000000000` in the curl example correctly represents 30 seconds in Go nanoseconds, which is how `time.Duration` is serialized by `encoding/json`.
- The Dapr actor HTTP invocation URL pattern (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is correct.
- The `InvokeActorRequest` struct fields (`ActorType`, `ActorID`, `Method`, `Data`) match the current Dapr Go SDK client API.
- The summary's claim that this approach is "more flexible than the Dapr Lock API" for reentrant locks is reasonable — the built-in Distributed Lock API does not natively support reentrancy.
