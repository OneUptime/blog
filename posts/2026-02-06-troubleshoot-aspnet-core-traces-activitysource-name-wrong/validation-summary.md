# Validation Summary: How to Troubleshoot ASP.NET Core OpenTelemetry Traces Not Appearing Because

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- ASP.NET Core
- .NET `System.Diagnostics.ActivitySource` and `Activity`
- OpenTelemetry .NET SDK
- OpenTelemetry ASP.NET Core instrumentation
- OTLP exporter
- xUnit-style source registration test

## Sources Consulted
- OpenTelemetry .NET SDK tracing customization documentation: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry .NET traces getting started documentation: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-console/
- Microsoft Learn `ActivitySource.StartActivity` API reference: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity
- Microsoft .NET runtime `ActivitySource` source code: https://source.dot.net/System.Diagnostics.DiagnosticSource/System/Diagnostics/ActivitySource.cs.html
- NuGet documentation for `OpenTelemetry.Extensions.Hosting`: https://www.nuget.org/packages/OpenTelemetry.Extensions.Hosting

## Issues Found
- The post described `AddSource()` matching as requiring the exact same source string. OpenTelemetry .NET documentation says the `ActivitySource` name argument is case-insensitive and also supports wildcard subscriptions. Updated the explanation and final guidance to say the configured source name or wildcard pattern must match, while preserving the core warning about mismatched names.

## Review Notes
- The reflection-based `/debug/sources` example relies on the private `ActivitySource.s_activeSources` field. That field exists in current .NET runtime source, but it is internal implementation detail and should remain a temporary debugging technique only, as the post already notes.
- I could not compile the C# snippets locally because the `dotnet` CLI is not installed in this environment.
