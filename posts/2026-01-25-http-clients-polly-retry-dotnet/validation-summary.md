# Validation Summary: How to Build HTTP Clients with Polly Retry in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core `IHttpClientFactory`
- `HttpClient`
- Polly
- Microsoft.Extensions.Http.Polly
- Polly.Extensions.Http
- Retry policies
- Circuit breaker policies
- Timeout policies
- Bulkhead isolation

## Sources Consulted
- Microsoft Learn: Make HTTP requests with `IHttpClientFactory` in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn: Implement HTTP call retries with exponential backoff with Polly - https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-http-call-retries-exponential-backoff-polly
- Microsoft Learn: Implement the Circuit Breaker pattern - https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-circuit-breaker-pattern
- Microsoft Learn: Build resilient HTTP apps - https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
- Microsoft Learn: Introduction to resilient app development - https://learn.microsoft.com/en-us/dotnet/core/resilience/
- Microsoft Learn API reference: `AddTransientHttpErrorPolicy` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.pollyhttpclientbuilderextensions.addtransienthttperrorpolicy
- Polly documentation: Retry resilience strategy - https://www.pollydocs.org/strategies/retry.html
- Polly documentation: Circuit breaker resilience strategy - https://www.pollydocs.org/strategies/circuit-breaker.html
- Polly documentation: v7 to v8 migration guide / PolicyWrap order - https://www.pollydocs.org/migration-v8.html
- Polly.Extensions.Http repository README - https://github.com/App-vNext/Polly.Extensions.Http
- NuGet: Microsoft.Extensions.Http.Polly package deprecation notice - https://www.nuget.org/packages/Microsoft.Extensions.Http.Polly/
- Microsoft Learn: `dotnet package add` / `dotnet add package` CLI documentation - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The setup section implied `Microsoft.Extensions.Http.Polly` was the current recommended integration without mentioning that the package is now deprecated. Updated the text to clarify that the examples use Polly v7-style HTTP integration and that Microsoft recommends `Microsoft.Extensions.Http.Resilience` for new .NET 8+ projects.
- The `PolicyWrap` explanation said policies wrap from right to left. Polly v7 executes the first policy as the outermost policy and the last policy as the innermost policy. Updated the explanation to match the official Polly migration documentation.
- The combined timeout/retry/circuit breaker snippet used `TimeoutRejectedException` without showing the required `Polly.Timeout` namespace import. Added `using Polly.Timeout;`.
- The custom status code retry snippet used `HttpStatusCode` without showing the required `System.Net` namespace import. Added `using System.Net;`.
- The circuit breaker unit test expected `HttpRequestException` for HTTP 503 responses. `HandleTransientHttpError()` handles 5xx `HttpResponseMessage` results without requiring `EnsureSuccessStatusCode()`, so the first two calls return 503 responses and the next call throws `BrokenCircuitException`. Updated the assertions accordingly.

## Review Notes
The code examples remain intentionally scoped to the older `Microsoft.Extensions.Http.Polly` / `Polly.Extensions.Http` APIs because the post is written around Polly v7-style policies. A future modernization pass should consider rewriting the guide around `Microsoft.Extensions.Http.Resilience` and Polly v8 pipelines. Local compilation was not run because the `dotnet` CLI is not installed in the review environment.
