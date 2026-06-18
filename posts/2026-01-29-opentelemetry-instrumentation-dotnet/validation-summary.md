# Validation Summary: How to Instrument .NET Apps with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- OpenTelemetry .NET SDK
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry logging
- OTLP exporter
- SQL Client instrumentation
- HttpClient instrumentation

## Sources Consulted
- OpenTelemetry .NET instrumentation guide: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET metrics documentation: https://opentelemetry.io/docs/languages/dotnet/metrics/
- OpenTelemetry .NET exception reporting documentation: https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET runtime instrumentation NuGet documentation: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Runtime/
- OpenTelemetry .NET HTTP instrumentation documentation: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.Http/README.md
- OpenTelemetry .NET SQL Client instrumentation documentation: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/README.md
- OpenTelemetry OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- Microsoft .NET distributed tracing instrumentation guide: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Activity.AddException API reference: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception
- Microsoft TagList API reference: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.taglist

## Issues Found
- The package list used `.AddRuntimeInstrumentation()` but did not include the required `OpenTelemetry.Instrumentation.Runtime` package. Added the missing package command.
- The custom `OrderService` meter was created with `IMeterFactory`, but the metrics provider was not configured to listen to it. Added `.AddMeter("OrderService")` to the metrics configuration.
- The custom `ExternalServiceClient` ActivitySource shown later in the post was not included in the ActivitySource registration example. Added `.AddSource("ExternalServiceClient")`.
- The custom tracing example used `Activity.RecordException(ex)`, which is now marked obsolete in the OpenTelemetry .NET API source in favor of `Activity.AddException(ex)`. Updated the example to use `AddException`.

## Review Notes
The examples are illustrative and depend on application-specific types such as `AppDbContext`, `CreateOrderRequest`, `Order`, and `PaymentResult`. I could not run a compile check because the local environment does not have the `dotnet` CLI installed.
