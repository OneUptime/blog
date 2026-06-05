# Validation Summary: How to Trace SignalR Hubs with OpenTelemetry in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- ASP.NET Core
- SignalR hubs and hub filters
- .NET tracing with ActivitySource
- .NET metrics with System.Diagnostics.Metrics
- OTLP export

## Sources Consulted
- Microsoft Learn: Use hub filters in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hub-filters
- Microsoft Learn: Use hubs in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs
- Microsoft Learn: ASP.NET Core SignalR .NET Client - https://learn.microsoft.com/en-us/aspnet/core/signalr/dotnet-client
- Microsoft Learn: Microsoft.AspNetCore.Http.Connections.Features namespace - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.connections.features
- Microsoft Learn: Meter.CreateObservableGauge API - https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.meter.createobservablegauge
- Microsoft Learn: .NET observability with OpenTelemetry - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel
- OpenTelemetry .NET documentation: Reporting exceptions - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET repository documentation: TracerProviderBuilder AddSource wildcard support - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- NuGet Gallery: OpenTelemetry.Instrumentation.Http - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http

## Issues Found
- The package list called `.AddHttpClientInstrumentation()` but did not install `OpenTelemetry.Instrumentation.Http`. Added the missing package command so the extension method is available.
- The standalone hub, hub filter, and client snippets called `Activity.RecordException(...)` without importing the OpenTelemetry trace extension namespace. Added `using OpenTelemetry.Trace;` where needed.
- The hub snippet attempted to read the SignalR transport with `Context.Features.Get<string>()`, which is not the SignalR transport feature. Updated it to use `IHttpTransportFeature` from `Microsoft.AspNetCore.Http.Connections.Features` and record its `TransportType`.
- The client-side section implied that local client spans alone enable end-to-end distributed tracing. Clarified that a single correlated trace requires explicit trace-context propagation for hub method calls.
- The metrics service snippet used `Meter` without a namespace import. Added `using System.Diagnostics.Metrics;`.

## Review Notes
The article uses manual `ActivitySource` and `Meter` instrumentation for SignalR hub operations. ASP.NET Core instrumentation will capture HTTP requests such as negotiation, but hub method spans come from the custom activity sources and hub filter shown in the post. The package versions are not pinned, so future API changes may require another validation pass.
