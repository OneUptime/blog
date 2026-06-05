# Validation Summary: How to Configure OpenTelemetry for .NET Framework 4.6.2+ Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry .NET SDK
- .NET Framework 4.6.2+
- ASP.NET Web API / MVC on .NET Framework
- OpenTelemetry ASP.NET, HTTP, and SqlClient instrumentation
- OTLP exporter
- C# ActivitySource manual tracing
- Web.config / App.config configuration

## Sources Consulted
- OpenTelemetry .NET Framework instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/netframework/
- OpenTelemetry .NET exporters documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET resource documentation: https://opentelemetry.io/docs/languages/dotnet/resources/
- OpenTelemetry .NET SDK customization documentation: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry ASP.NET instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.AspNet/README.md
- OpenTelemetry HTTP instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.Http/README.md
- OpenTelemetry SqlClient instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/README.md
- NuGet OpenTelemetry package metadata: https://www.nuget.org/packages/OpenTelemetry
- NuGet OpenTelemetry ASP.NET instrumentation package metadata: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNet
- NuGet OpenTelemetry HTTP instrumentation package metadata: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- NuGet OpenTelemetry SqlClient instrumentation package metadata: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.SqlClient

## Issues Found
- Updated package versions from older 1.7.0-era references to current compatible package versions and added the missing `OpenTelemetry.Instrumentation.AspNet` package required for ASP.NET request instrumentation on .NET Framework.
- Replaced the manual `Application_BeginRequest` / `Application_EndRequest` request span helper with the documented ASP.NET `TelemetryHttpModule` registration and `.AddAspNetInstrumentation()` setup. The original approach bypassed the official ASP.NET instrumentation path and could mislead readers about required setup.
- Fixed the `TelemetryManager` sample to implement `IDisposable`, so lifecycle management examples compile cleanly.
- Replaced the .NET `HttpRequestMessage` filter option with the documented .NET Framework `FilterHttpWebRequest` option for outbound HTTP instrumentation.
- Removed outdated SqlClient options and kept the documented `RecordException` option.
- Added missing namespaces for samples that use `RecordException`, `CancellationToken`, and `Task`.
- Corrected the configuration sample to pass `serviceVersion` by named argument instead of accidentally passing it as `serviceNamespace`, and wired the configured OTLP endpoint and console exporter flag into the builder.
- Replaced the unsupported fixed latency-overhead claim with a workload-dependent performance statement.

## Review Notes
The article is now technically valid for a source-instrumented .NET Framework 4.6.2+ ASP.NET application. Readers should still test package binding redirects in their own legacy projects, because ASP.NET/.NET Framework dependency resolution can require project-specific binding redirect entries.
