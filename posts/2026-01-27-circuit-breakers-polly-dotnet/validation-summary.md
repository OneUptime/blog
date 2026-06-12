# Validation Summary: How to Implement Circuit Breakers with Polly in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- Polly circuit breaker policies
- Microsoft.Extensions.Http.Resilience
- IHttpClientFactory
- ASP.NET Core health checks
- System.Diagnostics.Metrics

## Sources Consulted
- Polly v8 migration guide: https://www.pollydocs.org/migration-v8.html
- Polly circuit breaker strategy documentation: https://www.pollydocs.org/strategies/circuit-breaker.html
- Polly v7 circuit breaker source for classic `CircuitBreakerAsync` and `AdvancedCircuitBreakerAsync` overloads: https://github.com/App-vNext/Polly/tree/7.2.4/src/Polly/CircuitBreaker
- Microsoft Learn resilient app development guidance: https://learn.microsoft.com/en-us/dotnet/core/resilience/
- Microsoft Learn HTTP resilience guidance: https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
- Microsoft Learn `AddStandardResilienceHandler` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.resiliencehttpclientbuilderextensions.addstandardresiliencehandler
- Microsoft Learn .NET CLI `dotnet package add` command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn ASP.NET Core health checks and `AddTypeActivatedCheck`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.healthchecksbuilderaddcheckextensions.addtypeactivatedcheck
- Microsoft Learn metrics instrumentation and `Meter.CreateCounter`: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation

## Issues Found
- The setup instructions installed `Microsoft.Extensions.Http.Polly`, which Microsoft documents as deprecated for current HTTP resilience in .NET. Replaced it with `Microsoft.Extensions.Http.Resilience`.
- The package commands used the older verb-first `dotnet add package` form. Updated them to the current .NET CLI noun-first `dotnet package add` form.
- The HttpClientFactory example used deprecated `Polly.Extensions.Http`/`AddPolicyHandler` integration and `HttpPolicyExtensions`. Replaced it with `AddStandardResilienceHandler` and current HTTP resilience options.
- The retry and circuit breaker combination example also used the deprecated HttpClient Polly integration. Replaced it with `AddResilienceHandler`, `HttpRetryStrategyOptions`, and `HttpCircuitBreakerStrategyOptions`.
- The health check registration used `AddCheck<CircuitBreakerHealthCheck>` even though the health check constructor requires a `string[]` argument that dependency injection would not know how to provide. Changed it to `AddTypeActivatedCheck` with explicit service-name arguments.

## Review Notes
The standalone Polly policy examples use the classic v7 policy API. Polly's migration guide states that this API remains available and fully supported through the `Polly` package, although new applications may prefer Polly v8 resilience pipelines for consistency with `Microsoft.Extensions.Http.Resilience`. The local environment did not have the `dotnet` CLI installed, so snippets were reviewed against official documentation and source rather than compiled locally.
