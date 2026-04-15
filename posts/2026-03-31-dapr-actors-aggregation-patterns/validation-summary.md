# Validation Summary: How to Use Actors for Aggregation Patterns in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Virtual Actors
- Dapr Actor State Management
- Dapr Actor HTTP API
- Go (Golang)

## Sources Consulted
- Dapr Go SDK source code: `github.com/dapr/go-sdk` — `actor/actor.go` for `ServerImplBase` / `ServerImplBaseCtx` definitions, state manager interfaces
- Dapr Go SDK source code: `github.com/dapr/go-sdk` — `client/actor.go` for `InvokeActorRequest` / `InvokeActorResponse` structs
- Dapr Go SDK source code: `github.com/dapr/go-sdk` — `client/client.go` for `InvokeActor` method on Client interface
- Dapr Go SDK source code: `github.com/dapr/go-sdk` — `actor/api/runtime.go` for actor configuration JSON field names
- Dapr Go SDK source code: `github.com/dapr/go-sdk` — `examples/actor/serving/main.go` for canonical actor implementation patterns
- Dapr runtime source code: `github.com/dapr/dapr` — `pkg/api/http/actors.go` for HTTP API endpoint format

## Issues Found

### Issue 1: Deprecated `actor.ServerImplBase` (line 42)
- **What was wrong:** The actor struct embedded `actor.ServerImplBase`, which is explicitly deprecated in the Dapr Go SDK in favor of `actor.ServerImplBaseCtx`.
- **What was changed:** Replaced `actor.ServerImplBase` with `actor.ServerImplBaseCtx`.
- **Why:** `ServerImplBase` is deprecated. The code already used context-aware method signatures and context-aware state manager calls (`Get(ctx, ...)`, `Set(ctx, ...)`), which are the `ServerImplBaseCtx` / `StateManagerContext` pattern. Using the deprecated base struct was inconsistent with the rest of the code and would cause compilation issues since `ServerImplBase.GetStateManager()` returns `StateManager` (no context params), not `StateManagerContext`.

### Issue 2: Inconsistent actor ID in curl example (line 131)
- **What was wrong:** The curl example used actor ID `GET%20%2Fapi%2Forders%3A%3A2026-03-31T14%3A00` (URL-decoded: `GET /api/orders::2026-03-31T14:00`), which includes an HTTP method prefix `GET `. However, the `recordLatency` function constructs actor IDs as `fmt.Sprintf("%s::%s", endpoint, window)` where `endpoint` is just the path — no HTTP method prefix.
- **What was changed:** Removed the `GET%20` prefix from the curl URL, making it `%2Fapi%2Forders%3A%3A2026-03-31T14%3A00`.
- **Why:** The curl example should be consistent with the code pattern shown in the post.

## Review Notes
- The `GetStateManager()` method name, state manager `Get`/`Set` signatures, `Type() string` method, `InvokeActorRequest` struct fields, and actor HTTP API endpoint format (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) were all verified correct against the Dapr Go SDK source.
- The actor configuration JSON field names (`entities`, `actorIdleTimeout`, `actorScanInterval`) were verified correct against `actor/api/runtime.go`.
- The Dapr actor HTTP API accepts GET, POST, PUT, and DELETE for method invocation. The post uses POST via curl, which is valid.
- The second code block (routing events) references `dapr.Client` and `dapr.InvokeActorRequest`, implying `dapr` is an alias for `github.com/dapr/go-sdk/client`. This is the conventional import alias used in Dapr Go SDK examples and is correct.
- The post's aggregation pattern (time-bucketed actor IDs with idle timeout for cleanup) is a sound architectural approach and accurately described.
