# Validation Summary: How to Troubleshoot OpenTelemetry Metrics Not Exporting in .NET Because the

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry .NET SDK
- .NET `System.Diagnostics.Metrics`
- ASP.NET Core dependency injection
- OTLP and console metric exporters
- `MeterProvider`, `Meter`, `Counter`, and `Histogram`

## Sources Consulted
- OpenTelemetry .NET metrics for ASP.NET Core: https://opentelemetry.io/docs/languages/dotnet/metrics/getting-started-aspnetcore/
- OpenTelemetry .NET metrics for console applications: https://opentelemetry.io/docs/languages/dotnet/metrics/getting-started-console/
- OpenTelemetry .NET exporters documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET OTLP exporter README: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- OpenTelemetry .NET metrics best practices: https://opentelemetry.io/docs/languages/dotnet/metrics/best-practices/
- Microsoft Learn `MeterListener` API: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.meterlistener
- Microsoft Learn .NET metrics collection: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-collection
- Microsoft Learn .NET metrics instrumentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- Microsoft Learn `Counter<T>.Add` API: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.counter-1.add

## Issues Found
- The first broken configuration showed `builder.Services.AddOpenTelemetry().WithMetrics(...).AddOtlpExporter()`, which is a valid ASP.NET Core service registration pattern and includes a metric exporter/reader. I changed it to a non-hosted `Sdk.CreateMeterProviderBuilder()` example that omits `.Build()`, which accurately demonstrates a `MeterProvider` that is configured but never created.

## Review Notes
- The OTLP exporter default metric export interval of 60 seconds is correct for `AddOtlpExporter()` because it pairs the metric exporter with a `PeriodicExportingMetricReader`.
- `AddMeter(...)` is required for collecting custom meters; official OpenTelemetry .NET best practices list a missing `AddMeter` call as a common cause of missing metrics.
- The console exporter package command and the `AddConsoleExporter()` usage are current.
- The custom `Counter<T>` and `Histogram<T>` instrument examples use supported `System.Diagnostics.Metrics` APIs.
