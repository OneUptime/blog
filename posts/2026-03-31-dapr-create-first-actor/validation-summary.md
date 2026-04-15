# Validation Summary: How to Create Your First Dapr Actor

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actors (virtual actor model)
- Go programming language
- Redis (as actor state store)
- Dapr CLI

## Sources Consulted
- Dapr Go SDK source code on GitHub (`github.com/dapr/go-sdk`) — actor package (`actor/actor.go`), service/http package, and official examples (`examples/actor/`)
- Dapr official documentation for actor API invocation URL patterns (https://docs.dapr.io/reference/api/actors_api/)
- Dapr Go SDK official actor example (`examples/actor/serving/main.go`)
- Dapr CLI reference for `dapr run` command flags
- Dapr component spec for Redis state store

## Issues Found

1. **Deprecated `actor.ServerImplBase` struct**: The blog embedded `actor.ServerImplBase` which is deprecated in the Dapr Go SDK. The current recommended base struct is `actor.ServerImplBaseCtx`, which provides a context-aware state manager (`StateManagerContext`). Since the blog's code already passes `context.Context` to state manager methods (`Get` and `Set`), the code would not compile with the deprecated `ServerImplBase` (whose `StateManager` does not accept a context parameter). **Fixed** by changing to `actor.ServerImplBaseCtx`.

2. **Incorrect actor registration pattern**: The blog used `runtime.GetActorRuntimeInstance().RegisterActor(&CounterActorImpl{})`, which directly accesses the internal actor runtime and passes an instance rather than a factory function. The correct public API is `s.RegisterActorImplFactoryContext()` called on the service instance, which accepts a factory function of type `func() actor.ServerContext`. This is the pattern used in all official Dapr Go SDK examples. **Fixed** by replacing with `s.RegisterActorImplFactoryContext(func() actor.ServerContext { return &CounterActorImpl{} })` and updating imports accordingly (removed `actor/runtime`, added `actor`).

3. **Deprecated `--components-path` CLI flag**: The `dapr run` command used `--components-path` which has been deprecated in favor of `--resources-path`. While the old flag still works, tutorials should use the current flag. **Fixed** by replacing with `--resources-path`.

## Review Notes
- The actor HTTP invocation URL pattern (`v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is correct per official Dapr API documentation.
- The state store component YAML is correct, including the `actorStateStore: "true"` metadata field required to enable actor state persistence.
- The overall architecture and explanation of the Dapr actor model (turn-based concurrency, state management via sidecar) is accurate.
- The `go get github.com/dapr/go-sdk` command is correct for pulling the SDK dependency.
