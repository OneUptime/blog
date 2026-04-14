# Validation Summary: How to Use Dapr Service Invocation Between Go and .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation)
- Go (Dapr Go SDK)
- .NET (ASP.NET Core Minimal APIs, Dapr .NET SDK)
- Kubernetes (Dapr annotations)
- Dapr CLI (local development)

## Sources Consulted
- Dapr Go SDK source code and pkg.go.dev documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK service/common package: https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Go SDK service/http package: https://pkg.go.dev/github.com/dapr/go-sdk/service/http
- Dapr Go SDK GitHub repository: https://github.com/dapr/go-sdk
- Dapr .NET SDK GitHub repository (DaprClient.cs): https://github.com/dapr/dotnet-sdk
- Dapr .NET Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr Go Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr HTTP Service SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/go-service/http-service/
- Microsoft C# Records documentation: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record

## Issues Found

### 1. C# positional record used with object initializer syntax (compile error)
**What was wrong:** The `ProcessResult` was declared as a positional record (`record ProcessResult(string JobId, ...)`) but instantiated with object initializer syntax (`new ProcessResult { JobId = ... }`). Positional records do not have a parameterless constructor, so this will not compile.
**Fix:** Changed to use the positional constructor with named arguments: `new ProcessResult(JobId: ..., Status: ..., Input: ..., ProcessedAt: ...)`.

### 2. Go: `common.InvocationHandler` struct does not exist (compile error)
**What was wrong:** The code used `&common.InvocationHandler{Fn: ...}` as the second argument to `AddServiceInvocationHandler`. The type `common.InvocationHandler` does not exist in the Dapr Go SDK. `AddServiceInvocationHandler` takes a `ServiceInvocationHandler` which is a function type, not a struct.
**Fix:** Replaced the entire broken Dapr service pattern with standard `net/http` handlers. Since Dapr sidecar sends service invocations as regular HTTP requests, standard HTTP handlers work correctly for receiving invocations.

### 3. Go: Dapr HTTP service created but never started
**What was wrong:** `daprd.NewService(":8080")` was called and handlers were registered, but `s.Start()` was never called. The Dapr service was never started.
**Fix:** Removed the unused `daprd.NewService` pattern entirely (see fix #2).

### 4. Go: Incompatible mixing of Dapr service and standard HTTP server
**What was wrong:** The code created a Dapr HTTP service (which uses a chi router internally) and also called `http.ListenAndServe` (which uses Go's default ServeMux). These are completely separate routers, so Dapr invocation handlers would never be reachable via the standard HTTP server.
**Fix:** Simplified to use only `net/http` with `http.HandleFunc` for both endpoints, removing the broken dual-server pattern.

### 5. Go: Port mismatch between code and dapr run command
**What was wrong:** The Go code listened on `:8080` but the `dapr run` command specified `--app-port 8081`. The Dapr sidecar would try to reach the app on port 8081 while the app listened on 8080.
**Fix:** Changed `http.ListenAndServe(":8080", nil)` to `http.ListenAndServe(":8081", nil)`.

### 6. .NET: Missing AddDaprClient() DI registration
**What was wrong:** The bidirectional communication section injects `DaprClient` via Minimal API parameter injection, but `builder.Services.AddDaprClient()` was never called. Without this registration, the DI container throws an `InvalidOperationException` at runtime.
**Fix:** Added comments in the bidirectional code snippet noting that `builder.Services.AddDaprClient()` and the `Dapr.AspNetCore` NuGet package are required.

### 7. .NET: App port not configured to match dapr run command
**What was wrong:** The .NET service used `app.Run()` without configuring a port. ASP.NET Core defaults to port 5000, but the `dapr run` command specified `--app-port 8080`.
**Fix:** Added `builder.WebHost.UseUrls("http://0.0.0.0:8080");` before `builder.Build()`.

## Review Notes
- The `InvokeMethodAsync` overloads on `DaprClient` in the .NET SDK are now marked `[Obsolete]`, with guidance to use native HTTP or gRPC proxying instead. The code still works but may generate compiler warnings. A future update could migrate to the recommended approach.
- The `InvokeMethodWithContent` usage in the Go SDK is correct and current.
- The Kubernetes annotations format is correct for Dapr sidecar injection.
- The Go code removes the `daprd` and `common` imports since standard `net/http` handlers are sufficient for receiving Dapr service invocations (the sidecar forwards requests as plain HTTP).
