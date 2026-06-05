# Validation Summary: How to Monitor .NET Background Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET BackgroundService and IHostedService
- ASP.NET Core hosted services and health checks
- OpenTelemetry .NET tracing and metrics
- System.Diagnostics ActivitySource and Activity
- System.Diagnostics.Metrics Meter, Counter, Histogram, and ObservableGauge
- OTLP exporter
- ASP.NET Core, HttpClient, and runtime instrumentation

## Sources Consulted
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- Microsoft Learn: .NET distributed tracing concepts - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts
- OpenTelemetry .NET documentation - https://opentelemetry.io/docs/languages/dotnet/
- OpenTelemetry .NET manual instrumentation - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET metrics documentation - https://opentelemetry.io/docs/languages/dotnet/metrics/
- OpenTelemetry .NET metric instruments - https://opentelemetry.io/docs/languages/dotnet/metrics/instruments/
- OpenTelemetry .NET reporting exceptions - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET SDK customization for traces - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry .NET SDK customization for metrics - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md
- OpenTelemetry baggage concepts - https://opentelemetry.io/docs/concepts/signals/baggage/
- NuGet: OpenTelemetry.Instrumentation.AspNetCore - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNetCore/
- NuGet: OpenTelemetry.Instrumentation.Http - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http/

## Issues Found
- The package installation block omitted `OpenTelemetry.Instrumentation.AspNetCore` and `OpenTelemetry.Instrumentation.Http`, even though the setup code calls `AddAspNetCoreInstrumentation()` and `AddHttpClientInstrumentation()`. Added both package commands.
- The main background service example used `Activity.RecordException()` without importing the OpenTelemetry trace extension namespace. Added `using OpenTelemetry.Trace;`.
- Cancellation during host shutdown could be recorded as an error in the batch and item processing spans. Added cancellation checks so `OperationCanceledException` caused by the service cancellation token is rethrown without marking the span as failed.
- A comment described baggage as the mechanism for correlation across service boundaries. Updated it to describe baggage as business context, and revised troubleshooting guidance to recommend propagating trace context for correlation.
- The long-running service example created a `Meter` as a local constructor variable. Stored it in a field and disposed it with the `ActivitySource` so instrument lifetime is explicit.
- The health check snippet used `ActivitySource` without showing the required `System.Diagnostics` import. Added the missing using directive.
- The troubleshooting section said metrics may be missing if a `Meter` is not created before OpenTelemetry SDK initialization. Updated this to the more accurate requirement that the meter name must be added to the provider configuration before the provider is built.

## Review Notes
The post is now technically valid as a focused tutorial. I could not run a local C# compilation check because the `dotnet` CLI is not installed in this environment, so validation was performed against official .NET and OpenTelemetry documentation.
