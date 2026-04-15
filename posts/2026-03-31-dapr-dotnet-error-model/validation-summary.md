# Validation Summary: How to Handle Errors Using Dapr .NET Error Model

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr .NET SDK (`Dapr.Client`, `Dapr.Common`)
- gRPC / `Grpc.Core` (RpcException, StatusCode)
- Polly (retry policies)
- ASP.NET Core Minimal APIs
- C# pattern matching

## Sources Consulted
- Dapr .NET SDK source code on GitHub (`dapr/dotnet-sdk`), specifically:
  - `src/Dapr.Common/DaprException.cs` — confirmed `DaprException` is a bare subclass of `Exception` with no `StatusCode` or `ExtendedErrorInfo` properties
  - `src/Dapr.Common/Exceptions/` — confirmed `TryGetExtendedErrorInfo()` extension method and `DaprExtendedErrorDetail` abstract record with strongly-typed subtypes
  - `src/Dapr.Client/DaprClient.cs` — confirmed `GetStateAsync` and `InvokeMethodAsync` signatures
- Dapr official documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/)
- Polly documentation for `Policy.Handle<T>()` predicate overload

## Issues Found

### 1. `DaprException.StatusCode` does not exist (Critical — code would not compile)
**What was wrong:** The blog used `ex.StatusCode` directly on `DaprException` in three code examples (Understanding DaprException, Handling Specific Error Codes, and Polly sections). `DaprException` has no `StatusCode` property — it is a bare subclass of `System.Exception`.
**What was changed:** All examples now cast `ex.InnerException` to `RpcException` to access the gRPC status code. The "Handling Specific Error Codes" section uses C# pattern matching in `when` clauses: `when (ex.InnerException is RpcException { StatusCode: StatusCode.Unavailable })`. The Polly example uses a predicate lambda with the same cast pattern.
**Why:** The gRPC status code is carried by the `RpcException` wrapped inside `DaprException.InnerException`, not as a direct property.

### 2. `DaprException.ExtendedErrorInfo` property does not exist (Critical — code would not compile)
**What was wrong:** The blog accessed `ex.ExtendedErrorInfo` as if it were a property on `DaprException`, then iterated `.Details` with `detail.TypeUrl` and `detail.Value`.
**What was changed:** Replaced with the correct `TryGetExtendedErrorInfo()` extension method from `Dapr.Common.Exceptions`, and updated the detail access to use the strongly-typed `detail.ErrorType` and type-checked `DaprErrorInfoDetail` with `.Reason` and `.Domain` properties.
**Why:** Extended error info is accessed via an extension method, not a property. The detail objects are strongly-typed records (`DaprErrorInfoDetail`, `DaprDebugInfoDetail`, etc.), not raw objects with `TypeUrl`/`Value` strings.

### 3. Missing `using Dapr;` directive
**What was wrong:** The first code example only had `using Dapr.Client;`, but `DaprException` is in the `Dapr` namespace (defined in `Dapr.Common`).
**What was changed:** Added `using Dapr;` to code examples that reference `DaprException`.
**Why:** Without this using directive, `DaprException` would not be in scope.

### 4. Missing `using Grpc.Core;` in relevant examples
**What was wrong:** The first code example referenced gRPC types without the appropriate using directive.
**What was changed:** Added `using Grpc.Core;` where `RpcException` and `StatusCode` are used.
**Why:** `RpcException` and `StatusCode` are in the `Grpc.Core` namespace.

### 5. Overview and Summary text inaccuracies
**What was wrong:** The Overview described `DaprException` as carrying "a rich error detail object" directly, and the Summary referenced "pattern-matching on `StatusCode`" and "reading `ExtendedErrorInfo`" as direct properties.
**What was changed:** Updated the Overview to clarify that `DaprException` wraps the underlying `RpcException` and that extended error details are available via `TryGetExtendedErrorInfo()`. Updated the Summary to reference the inner `RpcException.StatusCode` and `TryGetExtendedErrorInfo()`.
**Why:** The original text implied these were direct properties of `DaprException`, which is inaccurate.

## Review Notes
- `InvokeMethodAsync` (used in the "Handling Specific Error Codes" example) is marked `[Obsolete]` in the Dapr .NET SDK with guidance to use native HTTP or gRPC clients for service invocation instead. The method still compiles and works, but readers should be aware it may be removed in a future version.
- The Polly example uses the Polly v7 API (`Policy.Handle<T>().WaitAndRetryAsync()`). Polly v8 introduced a new `ResiliencePipeline` API. The v7 API still works but readers starting new projects may want to consider the newer Polly v8 patterns.
- `GetStateAsync` returns `default(T)` (not null exception) when a key is not found, so the null check in the "Returning Errors" section is correct behavior for handling missing state entries.
