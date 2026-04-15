# Validation Summary: How to Use Dapr with .NET Aspire

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET Aspire
- Dapr .NET SDK (`DaprClient`)
- Aspire.Hosting.Dapr NuGet package
- Redis (as Dapr state store backing)
- OpenTelemetry (via Aspire dashboard)

## Sources Consulted
- Microsoft .NET Aspire Dapr integration documentation (https://learn.microsoft.com/en-us/dotnet/aspire/frameworks/dapr)
- Aspire.Hosting.Dapr NuGet package API reference (https://www.nuget.org/packages/Aspire.Hosting.Dapr)
- Dapr .NET SDK documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/)
- DaprSidecarOptions API reference for WithDaprSidecar method overloads
- .NET Aspire dashboard documentation

## Issues Found

### 1. Incorrect `WithDaprSidecar` callback pattern
- **What was wrong:** The post used a lambda callback pattern `WithDaprSidecar(options => { options.AppId = "..."; options.AppPort = ...; })` which does not match any valid overload. The callback overload receives `IResourceBuilder<IDaprSidecarResource>`, not `DaprSidecarOptions`.
- **What was changed:** Replaced the lambda with the correct `new DaprSidecarOptions { AppId = "...", AppPort = ... }` object initializer pattern, which matches the `WithDaprSidecar(DaprSidecarOptions?)` overload.
- **Why:** The original code would not compile.

### 2. Incorrect `AddDaprStateStore` parameter for Redis wiring
- **What was wrong:** The post showed `builder.AddDaprStateStore("statestore", redis)` passing a Redis resource as a second parameter. The `AddDaprStateStore` method signature is `AddDaprStateStore(string name, DaprComponentOptions? options = default)` and does not accept a resource reference as a parameter.
- **What was changed:** Replaced with `builder.AddDaprStateStore("statestore").WithReference(redis)` which chains `.WithReference()` on the result.
- **Why:** The original code would not compile; `AddDaprStateStore` does not accept a Redis resource parameter.

### 3. Incorrect Aspire dashboard URL
- **What was wrong:** The post claimed the dashboard is available at `https://localhost:15888`. When launching from an AppHost, the dashboard port is dynamically assigned and the URL is printed to the console. There is no fixed default port of 15888 for the dashboard.
- **What was changed:** Replaced the hardcoded URL comment with `# Dashboard URL is printed in the console output`.
- **Why:** Citing a specific URL could confuse readers when their dashboard appears on a different port.

## Review Notes
- The `Aspire.Hosting.Dapr` package (v9.1.0) is the official Microsoft package and is correctly referenced. A community alternative (`CommunityToolkit.Aspire.Hosting.Dapr`) also exists but the original package remains valid.
- The Dapr .NET SDK APIs (`SaveStateAsync`, `PublishEventAsync`, `AddDaprClient`, `UseCloudEvents`, `MapSubscribeHandler`) are all correct and current.
- The installation commands (`dotnet workload install aspire`, `dapr init`) are correct.
- The `AddDaprStateStore` and `AddDaprPubSub` builder extension methods are correct.
- The service project setup code (AddServiceDefaults, MapDefaultEndpoints, middleware ordering) is correct.
