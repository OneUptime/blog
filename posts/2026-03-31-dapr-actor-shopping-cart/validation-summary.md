# Validation Summary: How to Build a Shopping Cart Service with Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) virtual actors
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Redis (as actor state store)
- Kubernetes (deployment with Dapr sidecar injection)
- Dapr HTTP API for actor method invocation

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (actor package, client package)
- Dapr official documentation on actors: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr actor API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Deprecated `ServerImplBase` used instead of `ServerImplBaseCtx`**: The actor implementation embedded `dapr.ServerImplBase` which is deprecated. The code uses context-aware state manager methods (`GetStateManager().Get(ctx, ...)` and `GetStateManager().Set(ctx, ...)`), which require `ServerImplBaseCtx` — the context-aware base struct whose `GetStateManager()` returns `StateManagerContext`. Changed to `dapr.ServerImplBaseCtx`.

2. **Unused imports in `cart_actor_impl.go`**: The imports `"encoding/json"` and `"strings"` were listed but never used in the implementation. This would cause a Go compilation error (`imported and not used`). Removed both unused imports.

3. **Unused imports in `api.go`**: The imports `"encoding/json"` and `"fmt"` were listed but never used. Replaced with `"context"` which is needed for the corrected `invokeActor` function signature.

4. **Non-existent `InvokeActorMethod` API**: The `invokeActor` function called `client.InvokeActorMethod(...)` which does not exist in the Dapr Go SDK client. The correct method is `client.InvokeActor(ctx, *InvokeActorRequest)` which returns `(*InvokeActorResponse, error)`. Fixed to use `client.InvokeActor()` with a properly constructed `dapr.InvokeActorRequest` struct.

5. **`r.Context()` not in scope in `invokeActor`**: The `invokeActor` function referenced `r.Context()` but `r *http.Request` was not a parameter of the function. Fixed by adding `ctx context.Context` as the first parameter and passing `r.Context()` from the caller (`cartHandler`).

6. **`resp` type mismatch with `w.Write()`**: After fixing to use `InvokeActor`, the response is `*InvokeActorResponse` (a struct), not `[]byte`. Changed `w.Write(resp)` to `w.Write(resp.Data)` to extract the byte payload.

7. **GetCart curl uses GET method**: Dapr actor method invocation requires PUT or POST, not GET. The bare `curl` command without `-X` defaults to GET. Changed to `curl -X POST` to match the Dapr actor HTTP API specification.

## Review Notes
- The cart actor logic (add item, remove item, update quantity, checkout, coupon application) is correct and well-structured.
- The mermaid sequence diagram accurately represents the actor invocation flow.
- The state store YAML configuration with `actorStateStore: "true"` is correct.
- The Kubernetes deployment YAML with Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) is correct.
- The explanation of Dapr's placement service for actor routing across replicas is accurate.
- The `api.go` code ignores the error from `dapr.NewClient()` with `client, _ := dapr.NewClient()`. While acceptable for a blog snippet, production code should handle this error.
- The `Checkout` method silently ignores the `saveCart` error with `_ = c.saveCart(ctx, state)`. This is noted in the code but could lead to inconsistent state in production.
