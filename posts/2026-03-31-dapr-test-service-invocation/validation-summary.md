# Validation Summary: How to Test Dapr Service Invocation Calls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Service Invocation
- Dapr .NET SDK (`DaprClient`)
- C# / .NET
- Moq (mocking framework)
- xUnit (test framework)
- ASP.NET Core Minimal APIs (stub service)
- Dapr Multi-App Run
- WireMock.NET

## Sources Consulted
- Dapr .NET SDK source — `DaprClient` abstract class method signatures for `InvokeMethodAsync` overloads (https://github.com/dapr/dotnet-sdk)
- Dapr documentation — Service Invocation building block (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/)
- Dapr documentation — Multi-App Run (https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/)
- Validated blog post `2026-03-31-dapr-unit-test-applications` — cross-referenced DaprClient mockability and mock setup patterns
- WireMock.NET documentation (https://github.com/WireMock-Net/WireMock.Net)

## Issues Found
1. **Incorrect mock parameter type in `GetStockAsync_ReturnsStockLevel` test**: The mock setup included a non-existent `IReadOnlyCollection<(string, string)>` headers parameter in the `InvokeMethodAsync<StockLevel>` call. The actual `DaprClient.InvokeMethodAsync<TResponse>(HttpMethod, string, string, CancellationToken)` overload has no headers parameter. Removed the `It.IsAny<IReadOnlyCollection<(string, string)>>()` argument so the mock matches the real method signature: `(HttpMethod, string, string, CancellationToken)`.

2. **Incorrect mock parameter type in `ReserveStockAsync_SendsReservationRequest` test**: Same issue — the mock setup for `InvokeMethodAsync<TRequest, TResponse>` included a spurious `IReadOnlyCollection<(string, string)>` headers parameter. The actual signature is `(HttpMethod, string, string, TRequest, CancellationToken)`. Removed the extra parameter to match the SDK.

## Review Notes
- `DaprClient` is an abstract class (not an interface), which makes it directly mockable with Moq without needing a wrapper. This is correctly used throughout the post.
- The Multi-App Run YAML configuration uses the correct field names: `appID`, `appPort`, `daprHTTPPort`, and `command`. Verified against the Dapr documentation and other validated posts in the repository.
- The `dapr run -f` command for Multi-App Run is correct.
- The WireMock.NET section correctly uses the `dapr-app-id` header, which Dapr sidecars add to forwarded requests to identify the calling application.
- The stub service uses valid ASP.NET Core Minimal API patterns.
- If custom HTTP headers are needed for service invocation tests, the recommended approach is to use `DaprClient.CreateInvokeMethodRequest()` to get an `HttpRequestMessage`, add headers, then call `InvokeMethodAsync(HttpRequestMessage, CancellationToken)` — as demonstrated in the validated `dapr-unit-test-applications` post.
