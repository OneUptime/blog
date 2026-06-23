# Validation Summary: How to Set Up OpenTelemetry in ASP.NET Core

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- .NET / C#
- ASP.NET Core
- OpenTelemetry (.NET SDK)
- OpenTelemetry instrumentation packages (AspNetCore, Http, SqlClient, Runtime, Process)
- OTLP exporter / OpenTelemetry Collector
- Distributed tracing (`ActivitySource`, `Activity`)
- Metrics (`System.Diagnostics.Metrics`, `IMeterFactory`, `Meter`)
- Structured logging (`builder.Logging.AddOpenTelemetry`)
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry .NET docs — Getting Started / ASP.NET Core: https://opentelemetry.io/docs/languages/dotnet/
- OpenTelemetry .NET GitHub (instrumentation & exporters): https://github.com/open-telemetry/opentelemetry-dotnet and https://github.com/open-telemetry/opentelemetry-dotnet-contrib
- `OpenTelemetry.Instrumentation.AspNetCore` README (options: `RecordException`, `Filter`, `EnrichWithHttpRequest`, `EnrichWithHttpResponse`)
- `OpenTelemetry.Instrumentation.Runtime` and `OpenTelemetry.Instrumentation.Process` NuGet packages
- .NET API docs — `System.Diagnostics.Metrics` (`Counter<T>`, `Histogram<T>`, `ObservableGauge<T>`, `IMeterFactory`)
- .NET API docs — `System.Diagnostics` (`ActivitySource`, `Activity`, `ActivityStatusCode`)
- W3C Trace Context spec (`traceparent` header format): https://www.w3.org/TR/trace-context/

## Issues Found
- **Missing NuGet packages in the installation list.** The OTLP exporter section and the complete configuration both call `AddRuntimeInstrumentation()` and `AddProcessInstrumentation()`, which are provided by the `OpenTelemetry.Instrumentation.Runtime` and `OpenTelemetry.Instrumentation.Process` packages respectively. These packages were not listed in the "Installing OpenTelemetry Packages" section, so a reader following along would hit compile errors. Added the two `dotnet add package` lines to the install list.

## Review Notes
- The modern `AddOpenTelemetry().WithTracing(...).WithMetrics(...)` builder pattern, `ConfigureResource`, `IMeterFactory`-based meter creation, sampler classes (`AlwaysOnSampler`, `TraceIdRatioBasedSampler`, `ParentBasedSampler`), and the `EnrichWithHttpRequest`/`EnrichWithHttpResponse` option names all match current OpenTelemetry .NET APIs.
- The `traceparent` header is constructed in the W3C-correct `00-{traceId}-{spanId}-{flags}` format. Note that the manual propagation example is illustrative — in practice `HttpClient` instrumentation injects this header automatically, and mutating `HttpClient.DefaultRequestHeaders` per-request (as shown) is not ideal for a shared client. This is a design caveat rather than a technical error, and the surrounding comments already make clear it is a manual fallback.
- In the "Basic Setup" snippet, the `resourceBuilder` local variable is computed but unused (the actual resource is configured via `ConfigureResource`). Harmless dead code; left as-is since it is not incorrect.
- Code snippets are illustrative and omit some `using` directives and supporting type definitions (e.g. `Order`, `CreateOrderRequest`, the `OpenTelemetry.Trace` namespace needed for the `Activity.RecordException` extension). This is normal for tutorial snippets and was not modified.
- `.NET 9` introduced a built-in `Activity.AddException` method; the OpenTelemetry `RecordException` extension used here remains valid and supported.
