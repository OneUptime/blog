# Validation Summary: How to Use Dapr .NET SDK Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Client`)
- ASP.NET Core (dependency injection, service registration)
- gRPC (underlying transport for Dapr sidecar communication)
- OpenTelemetry .NET SDK (tracing, OTLP exporter)
- Polly (mentioned for retry/circuit-breaking)
- C# (async/await, pattern matching, ETags)

## Sources Consulted
- Dapr .NET SDK source code — `DaprException.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Common/DaprException.cs
- Dapr .NET SDK source code — `DaprServiceCollectionExtensions.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.AspNetCore/DaprServiceCollectionExtensions.cs
- Dapr .NET SDK source code — `DaprClient.cs` (GetStateAndETagAsync, TrySaveStateAsync): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Dapr .NET SDK source code — `DaprApiException.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprApiException.cs
- Dapr .NET SDK source code — `DaprExceptionExtensions.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Common/Exceptions/DaprExceptionExtensions.cs
- Dapr DaprClient usage docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/dotnet-daprclient-usage/
- Dapr richer error model docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-error-handling/dotnet-richer-error-model/

## Issues Found
1. **Incorrect property access on `DaprException`**: The original code used `ex.StatusCode == StatusCode.Unavailable` in a catch filter on `DaprException`. However, `DaprException` does not have a `StatusCode` property — it only extends `System.Exception` with no additional properties. The gRPC status code is available on the `InnerException`, which is a `Grpc.Core.RpcException`. Fixed the catch filter to: `catch (DaprException ex) when (ex.InnerException is RpcException rpcEx && rpcEx.StatusCode == StatusCode.Unavailable)`.

## Review Notes
- The `ConcurrencyException` used in the ETag example is not a standard .NET or Dapr exception class. It's used as a placeholder custom exception, which is clear from context, but readers may need to define their own.
- The Dapr .NET SDK also provides `DaprApiException` (with `ErrorCode` and `IsTransient` properties) and the `TryGetExtendedErrorInfo()` extension method for richer error handling. A future update could mention these newer APIs.
- All other code examples (`AddDaprClient`, `GetStateAsync<T>`, `SaveStateAsync`, `GetStateAndETagAsync`, `TrySaveStateAsync`, OpenTelemetry configuration) were verified as correct against the current SDK source.
