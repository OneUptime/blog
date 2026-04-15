# Validation Summary: How to Implement Actor Hierarchies in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (virtual actor building block)
- Go (Dapr Go SDK)
- Actor state management (StateManagerContext)
- Actor reentrancy configuration
- Dapr HTTP API for actor invocation

## Sources Consulted
- Dapr Go SDK source and API reference (github.com/dapr/go-sdk, pkg.go.dev)
- Dapr official documentation on actor reentrancy (docs.dapr.io)
- Dapr HTTP API reference for actor invocation (docs.dapr.io)
- Other validated Dapr actor posts in this blog for convention consistency (dapr-go-actors, dapr-actor-invocation-sdk, dapr-actor-state)

## Issues Found
1. **`actor.ServerImplBase` replaced with `actor.ServerImplBaseCtx`** (both `OrgActor` and `DepartmentActor`): The deprecated `ServerImplBase` returns a non-context-aware `StateManager` whose `Get`/`Set` methods do not accept a `context.Context` parameter. The code was calling `GetStateManager().Get(ctx, ...)` and `GetStateManager().Set(ctx, ...)`, which requires `ServerImplBaseCtx` and its context-aware `StateManagerContext`. This would have caused a compilation error.
2. **Added missing `encoding/json` and `fmt` imports** to the parent actor code block: The code uses `fmt.Sprintf` and `json.Unmarshal` but did not import those packages.

## Review Notes
- The `AddDeptRequest` type and `mustMarshal` helper function are referenced but not defined. This is acceptable for a blog tutorial that focuses on the hierarchy pattern rather than boilerplate, but readers may need to define these themselves.
- The `daprClient` field on `OrgActor` is not shown being initialized. In practice, the actor would need to create a client via `dapr.NewClient()` or receive one through dependency injection. This is a common omission in Dapr actor tutorials.
- The reentrancy configuration shown is valid but uses the global format. Dapr also supports per-actor-type reentrancy via `entitiesConfig`, which could be noted in a future update.
- The HTTP API URLs and curl commands are correct for the Dapr v1.x API.
