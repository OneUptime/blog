# Validation Summary: How to Invoke Actor Methods in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (Virtual Actor model)
- Dapr HTTP API for actor method invocation
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.actor` module)
- Go programming language
- Python programming language

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (InvokeActor method, InvokeActorRequest struct)
- Dapr Python SDK source code: https://github.com/dapr/python-sdk (DaprClient class, ActorProxy class)
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Python SDK actor examples: https://github.com/dapr/python-sdk/tree/master/examples/demo_actor

## Issues Found

### 1. Python SDK example used non-existent API (Critical)
**What was wrong:** The original code used `DaprClient().invoke_actor()` with parameters `actor_type`, `actor_id`, `method`, and `data`. The `invoke_actor()` method does not exist on the `DaprClient` class in the Dapr Python SDK. The `DaprClient` class has no actor invocation methods at all.

**What was changed:** Replaced the entire Python example with the correct `ActorProxy` pattern. The correct approach uses `ActorProxy.create()` from `dapr.actor` and calls `proxy.invoke_method()`. Actor proxy calls are async, so the example was updated to use `asyncio.run()` with an `async` function and `await`.

**Why:** The original code would fail at runtime with an `AttributeError`. The Dapr Python SDK uses the `ActorProxy` pattern for actor invocation, not the `DaprClient` class.

### 2. Go SDK example used undefined `mustMarshal` function (Minor)
**What was wrong:** The Go code called `mustMarshal(req)` to serialize the request struct, but this helper function was never defined in the code snippet. A reader copying this code would get a compilation error.

**What was changed:** Replaced `mustMarshal(req)` with explicit `json.Marshal(req)` and added the `"encoding/json"` import. Also added proper error handling for `dapr.NewClient()` instead of discarding the error with `_`.

**Why:** The code snippet should be self-contained and compilable. Using `json.Marshal` directly is clearer and doesn't require an undefined helper function.

## Review Notes
- The HTTP API endpoint pattern (`POST /v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is correct and well-documented in official Dapr docs.
- The Go SDK's `InvokeActor`, `InvokeActorRequest`, and `InvokeActorResponse` types with fields `ActorType`, `ActorID`, `Method`, and `Data` are all correct.
- The actor state management example using `GetStateManager().Get()` is correct for the Go SDK actor implementation.
- The claim about the placement service handling routing and turn-based concurrency is accurate per official Dapr documentation.
- The error code `ERR_ACTOR_INVOKE_METHOD` is plausible but not explicitly documented in the public Dapr API reference. The error handling pattern shown is still reasonable and representative.
- The description mentions gRPC invocation but the post does not include a gRPC example. This is a minor content gap, not a technical error.
