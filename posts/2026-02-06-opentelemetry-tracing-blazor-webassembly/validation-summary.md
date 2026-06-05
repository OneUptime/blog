# Validation Summary: How to Set Up OpenTelemetry Tracing in Blazor WebAssembly Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry .NET SDK
- OpenTelemetry OTLP exporter
- OpenTelemetry HTTP client instrumentation
- Blazor WebAssembly
- ASP.NET Core Web API
- .NET `Activity` and `ActivitySource`
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry .NET SDK tracing customization: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry .NET traces getting started: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-console/
- OpenTelemetry.Instrumentation.Http NuGet documentation: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- OpenTelemetry.Exporter.OpenTelemetryProtocol NuGet documentation: https://www.nuget.org/packages/OpenTelemetry.Exporter.OpenTelemetryProtocol
- OpenTelemetry.Extensions.Hosting NuGet documentation: https://www.nuget.org/packages/OpenTelemetry.Extensions.Hosting
- Microsoft.Extensions.Http NuGet documentation: https://www.nuget.org/packages/Microsoft.Extensions.Http
- ASP.NET Core Blazor WebAssembly HTTP client guidance: https://learn.microsoft.com/en-us/aspnet/core/blazor/call-web-api
- ASP.NET Core Blazor WebAssembly additional security scenarios for named `HttpClient` and handlers: https://learn.microsoft.com/en-us/aspnet/core/blazor/security/webassembly/additional-scenarios
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The package versions were outdated for a 2026 post. Updated OpenTelemetry package references to current stable versions and added `Microsoft.Extensions.Http`, which is required when using `AddHttpClient`/`IHttpClientFactory` in projects that do not already reference it.
- The custom `ActivitySource` named `BlazorWasmApp.Client` was never registered with the tracer provider. Added `.AddSource("BlazorWasmApp.Client")` so custom component spans are collected and exported.
- The OTLP/HTTP exporter endpoint was shown as `/telemetry`, but trace exporters should target a trace signal endpoint. Updated the examples to use `/telemetry/v1/traces` and changed the backend controller route to match.
- The Razor component used `GetFromJsonAsync` without showing the required `System.Net.Http.Json` namespace. Added the `@using` directive to make the snippet standalone.
- The backend forwarding explanation said browsers have limited connectivity options. Refined this to the more precise browser constraints: browser HTTP transport and CORS.
- The manual trace context handler formatted `traceparent` and `tracestate` headers directly. Replaced it with `Propagators.DefaultTextMapPropagator.Inject`, which follows OpenTelemetry propagation APIs and avoids duplicate/stale header values.
- The named `TracedClient` registration did not make the traced client available to components injecting `HttpClient`. Added a scoped `HttpClient` registration that resolves the named client.

## Review Notes
The snippets were not compiled locally because the workspace environment does not have the `dotnet` CLI installed. The review was performed against official OpenTelemetry, Microsoft, OTLP, and W3C documentation.
