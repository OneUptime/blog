# Validation Summary: How to Add OpenTelemetry to .NET 8 Minimal APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET 8
- ASP.NET Core Minimal APIs
- C#
- OpenTelemetry .NET SDK
- OpenTelemetry tracing and metrics
- ASP.NET Core endpoint filters
- ASP.NET Core middleware
- ASP.NET Core health checks
- HttpClient instrumentation
- OTLP exporter

## Sources Consulted
- Microsoft Learn: .NET default templates for `dotnet new` - https://learn.microsoft.com/dotnet/core/tools/dotnet-new-sdk-templates
- Microsoft Learn: Filters in Minimal API apps - https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/min-api-filters
- OpenTelemetry Docs: Getting started with traces for ASP.NET Core - https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry Docs: .NET instrumentation - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry Docs: Reporting exceptions in .NET traces - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET SDK docs: Customizing the SDK - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- NuGet Gallery: OpenTelemetry.Instrumentation.Runtime - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Runtime/

## Issues Found
- The package installation commands omitted `OpenTelemetry.Instrumentation.Runtime`, but the configuration used `.AddRuntimeInstrumentation()`. Added the missing package command because the runtime instrumentation extension is provided by that package.
- The tracing setup created custom activities from `MinimalApi.Filters` and `MinimalApi.HealthChecks` but did not register those activity sources with the tracer provider. Added both `.AddSource(...)` calls so those custom spans are collected.
- Several snippets used `Activity.RecordException()` without importing `OpenTelemetry.Trace`, where the extension method is defined. Added the missing `using OpenTelemetry.Trace;` statements to the relevant snippets.
- The route handler helper extended an already-created `Task<T>`, which can allow the handler work to begin before the custom activity is started. Changed the helper to accept `Func<Task<T>>` and updated route examples so the activity starts before the handler body runs.
- The middleware sample declared an unused `ActivitySource`, even though it only enriches `Activity.Current`. Removed the unused field to avoid misleading readers.

## Review Notes
The local environment did not have the .NET SDK installed, so CLI commands and compilation could not be executed locally. The commands and APIs were validated against Microsoft and OpenTelemetry documentation instead. The `dotnet new webapi -n MinimalApiOtel -minimal` command is valid, although .NET 8 and later create a minimal API project by default when `--use-controllers` is not specified.
