# Validation Summary: How to Use Dapr Service Invocation with .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / C#
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore`)
- ASP.NET Core Dependency Injection
- gRPC (`Grpc.Core`)

## Sources Consulted
- Dapr .NET SDK GitHub repository — https://github.com/dapr/dotnet-sdk (DaprClient.cs source confirming `[Obsolete]` attributes)
- Dapr .NET SDK client documentation — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr DaprClient usage documentation — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/dotnet-daprclient-usage/
- Dapr resiliency overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/

## Issues Found

1. **All `InvokeMethodAsync` overloads are marked `[Obsolete]` in the Dapr .NET SDK.**
   - **What was wrong:** The post presented `InvokeMethodAsync` as "Pattern 1" without mentioning that all overloads carry the `[Obsolete("Recommended guidance is to use a native HTTP or gRPC client for service invocation")]` attribute. Readers following this guide would encounter compiler warnings.
   - **What was changed:** Added a prominent note in the Overview section about the deprecation status and the recommended alternative (native HTTP client with `InvocationHandler` or `CreateInvokeHttpClient`). Updated the Summary to recommend the HttpClient factory pattern for new projects.

2. **`InvokeMethodWithResponseAsync` is also marked `[Obsolete]`.**
   - **What was wrong:** The Passing Headers section uses `InvokeMethodWithResponseAsync`, which is also deprecated. This was not mentioned.
   - **What was changed:** The deprecation note in the Overview now covers both `InvokeMethodAsync` and `InvokeMethodWithResponseAsync`.

3. **Incorrect claim that DaprClient handles retries automatically.**
   - **What was wrong:** The Summary stated "the DaprClient handles retries, mTLS, and tracing automatically." Dapr does not retry service invocation calls by default — retries require explicit configuration of resiliency policies via a resiliency spec.
   - **What was changed:** Removed "retries" from the automatic capabilities list and added a sentence directing readers to configure Dapr resiliency policies for retries and circuit breaking.

4. **Misleading description of `InvokeMethodAsync` as "gRPC-based calls".**
   - **What was wrong:** The Overview described Pattern 1 as "typed gRPC-based calls." While the DaprClient communicates with the Dapr sidecar via gRPC, the actual service invocation uses HTTP. The distinction is misleading.
   - **What was changed:** Changed "typed gRPC-based calls" to "typed calls."

## Review Notes
- The `CreateInvokeMethodRequest` method (used in the Passing Headers section) is NOT obsolete and remains a valid API, even though `InvokeMethodWithResponseAsync` that it pairs with is obsolete. A future update to this post could show an alternative approach for passing custom headers using the HttpClient factory pattern.
- The post does not mention that `AddDaprClient()` requires the `Dapr.AspNetCore` NuGet package, which is separate from `Dapr.Client`. This is not an error but could cause confusion for readers who only install `Dapr.Client`.
- The `InvocationHandler` shown in Pattern 2 uses a parameterless constructor, which defaults to the standard Dapr HTTP endpoint (`http://localhost:3500`). This is correct for local development but readers should be aware it may need configuration for other environments.
- All method signatures and API patterns shown in the post are technically correct and functional — the obsolescence is a deprecation warning, not a removal.
