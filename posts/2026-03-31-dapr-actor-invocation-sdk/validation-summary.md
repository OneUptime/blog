# Validation Summary: How to Use Dapr Actor Method Invocation via SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr` package)
- Dapr TypeScript/JavaScript SDK (`@dapr/dapr`)
- Virtual actor pattern (turn-based concurrency)
- Actor state management

## Sources Consulted
- Dapr Go SDK source code and examples: https://github.com/dapr/go-sdk
- Dapr Python SDK source code and examples: https://github.com/dapr/python-sdk
- Dapr JS SDK source code and examples: https://github.com/dapr/js-sdk
- Dapr actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/

## Issues Found

1. **Go SDK: `ServerImplBase` is deprecated** — Changed to `ServerImplBaseCtx`. The deprecated `ServerImplBase` returns a non-context `StateManager` whose methods don't accept `context.Context`, so the context-aware state calls in the blog would not compile.

2. **Go SDK: Unused `actor/state` import** — Removed `"github.com/dapr/go-sdk/actor/state"` which was imported but never referenced. Unused imports are compile errors in Go.

3. **Go SDK: `StateManager.Get()` return type wrong** — The blog had `exists, err := a.GetStateManager().Get(ctx, "status", &status)` expecting a `(bool, error)` return, but `Get()` returns only `error`. Fixed to use `Contains()` to check existence first, then `Get()` to retrieve the value.

4. **Go SDK: gRPC service does not support actors** — The blog used `github.com/dapr/go-sdk/service/grpc` which panics when actors are registered. Changed to `github.com/dapr/go-sdk/service/http` which is the only supported transport for actors in the Go SDK.

5. **Go SDK: Wrong factory function type and import** — The blog used `dapr "github.com/dapr/go-sdk/actor/runtime"` and `func() dapr.Actor`. The correct import is `"github.com/dapr/go-sdk/actor"` and the factory must return `actor.ServerContext`.

6. **Go SDK: `NewActorProxyWithClient` and `CallMethod` don't exist** — These functions are fabricated and do not exist in the Go SDK. Replaced the entire client section with the correct `ImplActorClientStub` pattern, which uses a struct with function fields that the SDK populates via reflection.

7. **Go SDK: Inaccurate comment about method signatures** — Removed the comment "Methods must return (interface{}, error)" which is incorrect. Actor methods can return 1 or 2 values; the last must be `error`, and the first (if present) can be any type.

8. **Go SDK: `dapr run` command flags** — Removed `--app-protocol grpc` (actors require HTTP) and updated `--app-port` from 6001 to 8080 to match the HTTP service port.

9. **Python SDK: Proxy method names must match `@actormethod(name=...)` values** — Changed `proxy.process(...)` to `proxy.Process(...)` and `proxy.get_status()` to `proxy.GetStatus()`. The `ActorProxy` dispatches method calls based on the `name` parameter of the `@actormethod` decorator, not the Python method name.

10. **TypeScript SDK: `ActorProxyBuilder` requires a class reference, not a string** — Changed `new ActorProxyBuilder<OrderActorInterface>("OrderActor", client)` to `new ActorProxyBuilder<OrderActorInterface>(OrderActor, client)`. The constructor expects a class/constructor reference, and uses `.name` internally to derive the actor type string.

11. **Go SDK: Summary text referenced non-existent API** — Updated the summary to reference `ImplActorClientStub` instead of the fabricated `ActorProxy.CallMethod`.

## Review Notes
- The Python SDK `save_state()` call inside actor methods is technically redundant since the `Actor` base class auto-saves state after each method invocation via `_on_post_actor_method_internal`. However, the official SDK examples also do this, so it was left as-is.
- The TypeScript SDK `saveState()` call is similarly redundant (`AbstractActor.onActorMethodPostInternal()` auto-saves), but was left unchanged for the same reason.
- The Mermaid sequence diagram is a conceptual illustration and is accurate in its depiction of the actor invocation flow.
