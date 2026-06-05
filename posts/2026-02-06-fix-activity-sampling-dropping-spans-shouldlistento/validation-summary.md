# Validation Summary: How to Fix Activity Sampling Dropping All Spans When

## Status
validated

## Post Type
Guide

## Technologies Covered
- .NET `System.Diagnostics.ActivitySource`
- .NET `System.Diagnostics.ActivityListener`
- OpenTelemetry .NET tracing
- OpenTelemetry .NET samplers
- ASP.NET Core and HTTP client instrumentation

## Sources Consulted
- Microsoft Learn `ActivityListener` API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitylistener
- Microsoft Learn `ActivitySource` API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource
- Microsoft Learn `ActivityTraceFlags` API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitytraceflags
- .NET runtime `ActivitySource` source code: https://source.dot.net/System.Diagnostics.DiagnosticSource/System/Diagnostics/ActivitySource.cs.html
- OpenTelemetry .NET instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET sampling documentation: https://opentelemetry.io/docs/languages/dotnet/sampling/
- OpenTelemetry .NET SDK customization documentation: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/

## Issues Found
- The temporary debugging `ActivityListener` returned `false` from `ShouldListenTo` while also claiming that its `Sample` callback would log activity creation attempts. In .NET, returning `false` prevents the listener from being attached to that `ActivitySource`, so its `Sample` callback is not invoked. Updated the snippet to return `true` and keep `Sample` returning `ActivitySamplingResult.None`, so the listener can observe sampling callbacks without requesting activity creation on its own.
- The explanatory sentence after the debugging snippet overstated that it prints every source that tries to create activities. Updated it to say the listener prints evaluated sources and activity creation attempts seen by that listener.

## Review Notes
The main guidance is consistent with current OpenTelemetry .NET documentation: custom `ActivitySource` names must be registered with `AddSource()`, `SetSampler` configures tracing sampling, the default sampler is parent-based with an always-on root sampler, and an invalid parent span context represents a root span. The local environment did not have the `dotnet` CLI installed, so code snippets were reviewed against official API documentation and source rather than compiled locally.
