# Validation Summary: How to Fix OpenTelemetry Logs Not Correlating with Traces in .NET Because

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry .NET
- ASP.NET Core
- Microsoft.Extensions.Logging / ILogger
- System.Diagnostics.Activity
- OTLP exporter
- OpenTelemetry log and trace correlation

## Sources Consulted
- OpenTelemetry .NET Log Correlation: https://opentelemetry.io/docs/languages/dotnet/logs/correlation/
- OpenTelemetry .NET Logs overview: https://opentelemetry.io/docs/languages/dotnet/logs/
- OpenTelemetry .NET Getting Started with logs - ASP.NET Core: https://opentelemetry.io/docs/languages/dotnet/logs/getting-started-aspnetcore/
- OpenTelemetry .NET Getting Started with traces - ASP.NET Core: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry .NET OTLP exporter README: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- OpenTelemetry .NET OpenTelemetryLoggerOptions source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Logs/ILogger/OpenTelemetryLoggerOptions.cs
- OpenTelemetry .NET OpenTelemetryLogger source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Logs/ILogger/OpenTelemetryLogger.cs
- OpenTelemetry semantic conventions for exceptions in logs: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
- Microsoft .NET observability with OpenTelemetry: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel

## Issues Found
- The post overstated `ParseStateValues` as the option that parses standard structured `ILogger` parameters into attributes. Current OpenTelemetry .NET exports normal structured logging state, such as `{OrderId}`, as attributes automatically because the state is already key-value data. Updated the description to clarify that `ParseStateValues` applies to non-standard log state values.
- The example `span_id` placeholder contained non-hex characters. Replaced both example IDs with valid hexadecimal trace and span ID values.
- The summary implied that traces and logs must use the same exporter. Correlation requires both signals to reach a backend that supports correlation; they do not have to be configured through the exact same exporter call. Updated the summary wording.
- The exception logging comment said the exception is included as a log attribute. In .NET the exception is attached to the log record, and exporters can map it to exception fields or attributes. Updated the wording to avoid over-specifying exporter behavior.

## Review Notes
The code snippets use current OpenTelemetry .NET APIs (`WithLogging`, `WithTracing`, `builder.Logging.AddOpenTelemetry`, `AddOtlpExporter`, and `AddConsoleExporter`) as shown in official docs. Local compilation was not possible because the .NET SDK is not installed in this environment (`dotnet` command not found).
