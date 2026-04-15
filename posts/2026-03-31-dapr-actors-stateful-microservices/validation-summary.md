# Validation Summary: How to Use Dapr Actors for Stateful Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (virtual actor model, Placement Service, actor lifecycle)
- Go (Dapr Go SDK for actor implementation)
- Python (Dapr Python SDK for actor implementation)
- Redis (as actor state store)
- Kubernetes (deployment target)
- Dapr HTTP API (direct actor invocation)

## Sources Consulted
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK (pkg.go.dev): https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Go SDK service/http package: https://pkg.go.dev/github.com/dapr/go-sdk/service/http
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Python Actor SDK Guide: https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/

## Issues Found

1. **Go code: unused imports causing compilation error** — The Go example imported `"fmt"` and `dapr "github.com/dapr/go-sdk/client"` but never used them. Go treats unused imports as compilation errors. Removed both unused imports.

2. **Go code: non-existent `actor.NewDefaultFactory` function** — The Go example used `actor.NewDefaultFactory(func() actor.Server { ... })` to wrap the factory function, but `NewDefaultFactory` does not exist in the Dapr Go SDK. The `RegisterActorImplFactory` method accepts an `actor.Factory` (a function type) directly. Changed to pass the factory function directly without the non-existent wrapper.

3. **HTTP API: incorrect method name casing** — The curl example used `getCount` (camelCase) in the URL path, but Dapr exposes Go actor methods with their exact PascalCase name. The Go implementation defines the method as `GetCount`, so the HTTP URL must use `GetCount` to match. Changed `getCount` to `GetCount`.

## Review Notes
- The Go SDK APIs used in this post (`actor.Server`, `actor.ServerImplBase`, `RegisterActorImplFactory`) are functional but deprecated in favor of their context-aware counterparts (`actor.ServerContext`, `actor.ServerImplBaseCtx`, `RegisterActorImplFactoryContext`). A future update could migrate to the newer APIs.
- The Python example imports `ActorTypeConfig` and `asyncio` without using them. These don't cause runtime errors in Python but are unnecessary.
- The Python `ActorRuntimeConfig` is constructed with string duration values (`"1h"`, `"30s"`). Some versions of the Python SDK expect `timedelta` objects instead. This may need updating depending on the SDK version targeted.
- The Python `increment` method explicitly calls `save_state()` after `set_state()`. In the Dapr Python actor SDK, state changes are automatically saved at the end of a method call, making the explicit save redundant (though not harmful).
