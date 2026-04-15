# Validation Summary: How to Use Dapr Actors for Real-Time Leaderboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model with turn-based concurrency)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Dapr Actor State Management
- Dapr HTTP Actor Invocation API
- Go (Golang)

## Sources Consulted
- Dapr Actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Go SDK actor package: https://github.com/dapr/go-sdk/tree/main/actor
- Dapr Actor API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK client InvokeActor: https://github.com/dapr/go-sdk/blob/main/client/actor.go
- Cross-referenced with other validated Dapr actor blog posts in this repository (rate-limiting, workflow-orchestration, stateful-microservices, session-management)

## Issues Found
1. **Missing `fmt` import (line 28-31)**: The `GetPlayerRank` method uses `fmt.Errorf` on line 107 but the `"fmt"` package was not included in the import block. This would cause a compilation error. Added `"fmt"` to the import list.

## Review Notes
- The post uses `actor.ServerImplBase` as the embedded base type. Some other validated posts in this repo use `actor.ServerImplBaseCtx` instead. Both patterns appear with context-aware state manager calls across the validated corpus, so this is consistent with existing usage.
- The `UpdateScore` and `GetPlayerRank` methods silently discard the error from `GetStateManager().Get()`. This is acceptable for a tutorial — on first invocation the state key won't exist, and the zero-value `LeaderboardState` (empty scores slice) is a safe default.
- The hierarchical leaderboards snippet discards errors from `client.InvokeActor()`. In production code these should be checked, but for a concise blog example this is reasonable.
- The `mustMarshal` helper function is referenced but not defined in the hierarchical leaderboards snippet. This is a common blog convention for brevity and is acceptable.
- The Dapr HTTP actor invocation API endpoint format (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) and the use of POST for method invocation are correct.
- The `dapr.InvokeActorRequest` struct with `ActorType`, `ActorID`, `Method`, and `Data` fields matches the Go SDK client API.
- The architectural advice about sharding for millions of players is sound — single-actor bottlenecks are a real concern with the virtual actor model at scale.
