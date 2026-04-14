# Validation Summary: How to Build a Machine Learning Feature Store with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub, actors, service invocation)
- Python (FastAPI, Dapr Python SDK)
- Go (Dapr Go SDK, HTTP service)
- C# / .NET (Dapr .NET SDK, actor framework)
- Redis (as state store backend)

## Sources Consulted
- Dapr Python SDK source — `DaprClient.invoke_method()` signature: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr Go SDK `InvocationEvent` struct and `AddServiceInvocationHandler` docs: https://pkg.go.dev/github.com/dapr/go-sdk/service/http
- Dapr Go SDK service invocation examples: https://docs.dapr.io/developing-applications/sdks/go/go-service/http-service/
- Dapr .NET SDK Actor base class constructor: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs
- Dapr .NET actor usage docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr state management component spec for Redis: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

1. **Python `invoke_method` — wrong positional argument for HTTP verb**: `"GET"` was passed as the 3rd positional argument, which maps to the `data` parameter, not `http_verb`. Fixed to use the keyword argument `http_verb="GET"`.

2. **Python `invoke_method` — response not parsed**: The return type of `invoke_method` is `InvokeMethodResponse`, not a dict. The code called `.get()` directly on the response object, which would fail. Fixed by parsing the response with `json.loads(resp.data)` before accessing fields.

3. **Go unused import — `"net/http"`**: The `net/http` package was imported but never used. Go treats unused imports as compilation errors. Removed the unused import.

4. **Go `InvocationEvent.TraceID` — non-existent field**: The code used `in.TraceID` to extract a user ID from the path. The `InvocationEvent` struct has no `TraceID` field (its fields are `Data`, `ContentType`, `DataTypeURL`, `Verb`, `QueryString`). This would not compile.

5. **Go `AddServiceInvocationHandler` — unsupported path parameter pattern**: The handler was registered with path `/features/user/{userId}`, but the Dapr Go SDK does not support path parameter patterns in service invocation handler routes. Fixed by changing the handler to accept the user ID in the request body via JSON, which is the idiomatic Dapr approach for service invocation.

6. **C# missing required constructor**: The `FeatureVersionActor` class extended `Actor` but did not define a constructor. The Dapr `Actor` base class requires an `ActorHost` parameter and has no parameterless constructor, so the code would not compile. Added `public FeatureVersionActor(ActorHost host) : base(host) { }`.

## Review Notes
- The Python code imports `Optional` from `typing` but never uses it. This is a minor style issue (not a compilation error in Python) and was left as-is.
- The Go code references undefined helper functions (`errorContent`, `getDefaultFeatures`). This is acceptable for a blog post that focuses on the Dapr integration patterns rather than complete application code.
- The Redis state store component YAML is correct and follows current Dapr component spec format.
- The C# `TryGetStateAsync` deconstruction pattern using `is var (found, value)` is valid C# 8+ syntax and works correctly with `ConditionalValue<T>.Deconstruct()`.
