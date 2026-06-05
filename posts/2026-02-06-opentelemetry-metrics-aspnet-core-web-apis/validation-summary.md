# Validation Summary: How to Configure OpenTelemetry Metrics Collection for ASP.NET Core Web APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry .NET SDK
- ASP.NET Core Web API
- System.Diagnostics.Metrics
- C#
- .NET runtime metrics
- Prometheus exporter
- Swashbuckle / Swagger UI

## Sources Consulted
- Microsoft Learn: Creating metrics with System.Diagnostics.Metrics and IMeterFactory - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- Microsoft Learn: ASP.NET Core built-in metrics - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/built-in-metrics-aspnetcore
- Microsoft Learn: ASP.NET Core metrics - https://learn.microsoft.com/en-us/aspnet/core/log-mon/metrics/metrics
- Microsoft Learn: .NET runtime metrics - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/built-in-metrics-runtime
- Microsoft Learn: Get started with Swashbuckle and ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle
- OpenTelemetry docs: .NET metrics for ASP.NET Core - https://opentelemetry.io/docs/languages/dotnet/metrics/getting-started-aspnetcore/
- OpenTelemetry docs: .NET exporters and Prometheus exporter - https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry semantic conventions: .NET HTTP metrics - https://opentelemetry.io/docs/specs/semconv/dotnet/dotnet-http-metrics/
- OpenTelemetry semantic conventions: .NET runtime metrics - https://opentelemetry.io/docs/specs/semconv/runtime/dotnet-metrics/
- NuGet package documentation: OpenTelemetry.Instrumentation.AspNetCore - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNetCore
- NuGet package documentation: OpenTelemetry.Instrumentation.Runtime - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Runtime

## Issues Found
- The histogram explanation said histograms automatically calculate percentiles. Updated it to clarify that histograms record distributions and monitoring backends can calculate percentiles from that data.
- The Prometheus ASP.NET Core exporter package command omitted prerelease installation. Updated the command to use `--prerelease`, matching the current package status and OpenTelemetry exporter guidance.
- The sample Program.cs used Swashbuckle APIs, but the setup commands did not install `Swashbuckle.AspNetCore`. Added the package command because Swashbuckle is no longer included by default in .NET 9 and later templates.
- The observable gauge callback read a field that is updated with `Interlocked` without a synchronized read. Changed the callback to use `Volatile.Read` and added the required `System.Threading` using.
- The ASP.NET Core built-in metrics list mixed current built-in metric names with unsupported body-size examples. Updated the section to distinguish .NET 6/7 behavior from .NET 8+ built-in metrics and replaced the examples with documented metric names.
- The runtime metrics section listed names that differ by target framework and included outdated names. Updated the .NET 8-and-earlier OpenTelemetry.Instrumentation.Runtime names and added the .NET 9+ built-in `System.Runtime` metric-name caveat.

## Review Notes
The local environment does not have the `dotnet` CLI installed, so I could not compile or run the sample project locally. API, package, and metric-name validation was performed against official Microsoft, OpenTelemetry, and NuGet package documentation.
