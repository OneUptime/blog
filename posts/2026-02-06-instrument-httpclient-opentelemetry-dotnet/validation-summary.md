# Validation Summary: How to Instrument HttpClient Calls with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry .NET SDK
- OpenTelemetry HttpClient instrumentation
- ASP.NET Core dependency injection and hosting
- .NET HttpClient and IHttpClientFactory
- Polly retry and timeout policies
- C# ActivitySource, Activity, and metrics APIs
- W3C trace context propagation

## Sources Consulted
- OpenTelemetry .NET HttpClient instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.Http/README.md
- OpenTelemetry .NET HttpClientTraceInstrumentationOptions source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.Http/HttpClientTraceInstrumentationOptions.cs
- OpenTelemetry .NET in-memory exporter README: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.InMemory/README.md
- Microsoft Learn, HTTP requests with IHttpClientFactory in ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn, built-in metrics for System.Net.Http: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/built-in-metrics-system-net
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The setup snippet used `.AddAspNetCoreInstrumentation()` but did not install `OpenTelemetry.Instrumentation.AspNetCore`. Added the missing package command.
- The test snippet used `.AddInMemoryExporter(exportedItems)` but did not install `OpenTelemetry.Exporter.InMemory`. Added the missing package command.
- Custom spans created from `HttpClientDemo.ExternalApi` and `HttpClientDemo.MultiApi` would not be exported unless the tracer provider listened to those sources. Added `.AddSource(...)` calls for both custom activity sources.
- The service snippet used `ReadFromJsonAsync` and `PostAsJsonAsync` without importing `System.Net.Http.Json`. Added the missing using directive.
- The weather request interpolated `city` directly into a query string. Changed it to `Uri.EscapeDataString(city)` so cities with spaces or reserved characters produce a valid URL.
- The custom header propagation handler only propagated `user.id` when the tag value was a string, but earlier examples set it as an integer. Changed the pattern to accept any non-null tag value and convert it to a string.
- The instrumentation test asserted that a tag key exactly named `http` exists. Current OpenTelemetry HTTP semantic conventions use keys such as `http.request.method`, `http.response.status_code`, and `url.full`. Updated the assertion to check for current HTTP-related tag keys.
- The best-practice statement said `IHttpClientFactory` is required for instrumentation to work correctly. OpenTelemetry can instrument directly created `HttpClient` instances too, so the wording now recommends `IHttpClientFactory` for lifecycle management without making instrumentation depend on it.
- The timeout guidance described hung requests as creating orphaned spans. Updated the wording to describe long-running spans until completion or cancellation.

## Review Notes
The OpenTelemetry HttpClient instrumentation option names in the post are current for modern .NET and .NET Core runtimes. Polly-based handlers remain supported through `Microsoft.Extensions.Http.Polly`, though newer .NET applications may also consider the Microsoft resilience extensions for future resilience policy work. Local compilation was not run because the review environment does not have the `dotnet` SDK installed.
