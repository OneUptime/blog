# Validation Summary: How to Use Actors for Session Management in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Go (Golang)
- HTTP API for Dapr actor invocation

## Sources Consulted
- Dapr Actors API Reference — https://docs.dapr.io/reference/api/actors_api/
- Dapr Actor Runtime Features and Concepts — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr Actor Runtime Configuration — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Go SDK Actor Package — https://pkg.go.dev/github.com/dapr/go-sdk/actor

## Issues Found

### 1. Missing `fmt` import (compilation error)
**What was wrong:** The Go actor code used `fmt.Errorf` but did not include `"fmt"` in the import block, causing a compilation error.
**Fix:** Added `"fmt"` to the import statement.

### 2. `ServerImplBase` used with context-aware state manager methods (compilation error)
**What was wrong:** The actor struct embedded `actor.ServerImplBase`, whose `GetStateManager()` returns a `StateManager` interface with methods that do **not** accept a `context.Context` parameter (e.g., `Set(stateName, value)`). However, the code called `a.GetStateManager().Set(ctx, "session", req)` passing a context, which matches the `StateManagerContext` interface returned by `ServerImplBaseCtx`. This mismatch would cause a compilation error. Additionally, `ServerImplBase` is deprecated in favor of `ServerImplBaseCtx`.
**Fix:** Changed `actor.ServerImplBase` to `actor.ServerImplBaseCtx`.

### 3. Incorrect claim about actor idle timeout behavior (conceptual error)
**What was wrong:** The post stated: "When a session actor is idle for 30 minutes, Dapr deactivates it. Subsequent calls to that session return an error, which your middleware treats as an expired session." This is factually incorrect. Dapr actor deactivation only removes the actor object from memory. The actor's persisted state remains in the state store. When a subsequent call arrives for a deactivated actor, Dapr automatically reactivates it and restores all persisted state. Therefore, idle timeout alone does **not** function as session expiry — sessions would never actually expire.
**Fix:** Added an `ExpiresAt` field to `SessionData`, set it during `CreateSession` (30-minute TTL), and added an expiry check in `GetSession` that returns an error and removes state when the session has expired. Updated the idle timeout explanation to correctly describe deactivation behavior and clarify that session expiry is enforced by the timestamp check, while idle timeout serves as a memory optimization.

## Review Notes
- The middleware snippet does not close `resp.Body`, which is a resource leak in production code. Acceptable for a simplified blog example but worth noting.
- The middleware passes the `Authorization` header value directly into the actor invocation URL without URL-encoding, which could cause issues with tokens containing special characters. In production, the token should be URL-encoded.
- The `actorIdleTimeout` and `actorScanInterval` configuration field names and value formats are correct per Dapr documentation. The default idle timeout is 60 minutes; the post configures 30 minutes which is valid.
- The Dapr HTTP actor invocation URL pattern (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) and use of POST are correct.
