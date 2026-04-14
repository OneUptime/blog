# Validation Summary: How to Use Dapr Service Invocation Between .NET and Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, resiliency policies)
- .NET 8 / ASP.NET Core Web API
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore`)
- Python / Flask
- Docker Compose with Dapr sidecars
- gRPC (error handling via `Grpc.Core.RpcException`)

## Sources Consulted
- Dapr .NET SDK source code — `DaprClient.cs` InvokeMethodAsync overloads (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs)
- Dapr .NET SDK source code — `InvocationException.cs` (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/InvocationException.cs)
- Dapr .NET SDK source code — `DaprMvcBuilderExtensions.cs` AddDapr() implementation (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.AspNetCore/DaprMvcBuilderExtensions.cs)
- Dapr Service Invocation API reference (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dapr Resiliency overview and schema (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr self-hosted with Docker documentation (https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/)
- Dapr CLI `dapr run` reference (https://docs.dapr.io/reference/cli/dapr-run/)

## Issues Found

1. **Redundant `AddDaprClient()` call in Program.cs**: The post called both `builder.Services.AddControllers().AddDapr()` and `builder.Services.AddDaprClient()`. The `AddDapr()` extension method already calls `AddDaprClient()` internally, so the second call was redundant. Removed the `AddDaprClient()` line.

2. **Null-dereference risk in `InvocationException` error handling**: The post used `ex.Response.StatusCode` in a `when` filter clause, but `InvocationException.Response` can be null for non-HTTP failures. This would cause a `NullReferenceException` at runtime. Changed to `ex.Response?.StatusCode` to safely handle the null case.

## Review Notes
- The `version: '3.8'` field in the Docker Compose file is deprecated in newer versions of Docker Compose (v2+), but it is harmless and still accepted. Future updates could remove it.
- The post uses `flask==3.0.0` which is a valid and current version. Flask 3.x requires Python 3.8+.
- The `InvokeMethodAsync<TRequest, TResponse>` overload without an explicit `HttpMethod` parameter correctly defaults to POST, which is well-suited for the `CreateProduct` use case.
- The Dapr resiliency YAML is correctly structured with valid field names (`policy: exponential`, `maxRetries`, `maxInterval`, `targets.apps`).
- The Docker Compose `network_mode: "service:<name>"` pattern is the officially recommended approach for Dapr sidecar containers.
