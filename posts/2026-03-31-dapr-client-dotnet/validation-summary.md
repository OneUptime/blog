# Validation Summary: How to Use DaprClient in .NET Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / C#
- Dapr .NET SDK (`Dapr.Client` and `Dapr.AspNetCore` NuGet packages)
- DaprClient API (state management, service invocation, pub/sub, secrets, bindings)

## Sources Consulted
- Dapr .NET SDK source code on GitHub: https://github.com/dapr/dotnet-sdk
- `DaprClient.cs` abstract class — verified all method signatures, return types, and parameter types
- `DaprClientBuilder.cs` — verified client creation pattern
- `DaprServiceCollectionExtensions.cs` — verified `AddDaprClient()` is in the `Dapr.AspNetCore` package
- Dapr .NET SDK official documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/

## Issues Found

### 1. Missing `Dapr.AspNetCore` package in prerequisites
- **What was wrong:** The prerequisites section only listed `dotnet add package Dapr.Client`, but the `AddDaprClient()` DI extension method shown in the "Creating DaprClient" section is defined in the `Dapr.AspNetCore` package, not `Dapr.Client`.
- **What was changed:** Added `dotnet add package Dapr.AspNetCore` to the prerequisites with a comment explaining it is required for DI registration.
- **Why:** Without this package, `AddDaprClient()` would not be available and the code would fail to compile.

### 2. Service invocation methods are marked `[Obsolete]`
- **What was wrong:** The `InvokeMethodAsync` methods used in the Service Invocation section are marked with `[Obsolete]` in the current Dapr .NET SDK. The recommended guidance is to use native HTTP or gRPC clients for service invocation (e.g., via `DaprClient.CreateInvokeHttpClient()`).
- **What was changed:** Added a blockquote note before the Service Invocation code examples informing readers that these methods are deprecated and pointing to the recommended alternative.
- **Why:** Without this note, readers following the tutorial would encounter compiler warnings and be using a deprecated pattern without knowing the current best practice.

## Review Notes
- All state management API signatures (`SaveStateAsync`, `GetStateAsync`, `GetStateAndETagAsync`, `TrySaveStateAsync`, `DeleteStateAsync`) are correct and current.
- The `GetStateAndETagAsync` return type `(TValue value, string etag)` tuple is accurate.
- `TrySaveStateAsync` correctly returns `Task<bool>` as shown.
- Pub/sub `PublishEventAsync` signatures are correct, including the metadata overload with `Dictionary<string, string>`.
- `GetSecretAsync` correctly returns `Dictionary<string, string>` and the key-based access pattern shown is valid.
- `GetBulkSecretAsync` signature is correct.
- `InvokeBindingAsync` is generic (`InvokeBindingAsync<TRequest>`) but the type parameter is inferred from the argument, so the call-site code in the blog compiles correctly without explicitly specifying the type.
- The `metadata` parameter in `InvokeBindingAsync` is typed as `IReadOnlyDictionary<string, string>?`, but passing a `Dictionary<string, string>` works because `Dictionary` implements `IReadOnlyDictionary`.
