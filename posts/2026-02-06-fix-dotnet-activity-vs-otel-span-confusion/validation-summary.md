# Validation Summary: How to Fix the Confusion Between .NET System.Diagnostics.Activity

## Status
validated

## Post Type
Guide

## Technologies Covered
- .NET `System.Diagnostics.Activity`
- .NET `System.Diagnostics.ActivitySource`
- OpenTelemetry .NET
- Distributed tracing
- C# async context propagation

## Sources Consulted
- Microsoft Learn: Adding distributed tracing instrumentation, https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Learn: `ActivitySource.StartActivity`, https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity
- Microsoft Learn: `Activity.Current`, https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.current
- Microsoft Learn: `ActivitySamplingResult`, https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysamplingresult
- OpenTelemetry Docs: .NET Instrumentation, https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry Docs: Getting started with traces - Console, https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-console/
- OpenTelemetry Docs: OpenTelemetry Tracing Shim, https://opentelemetry.io/docs/languages/dotnet/shim/

## Issues Found
- The original mapping described `TracerProvider` as equivalent to `ActivitySource + ActivityListener`. This was too broad: in OpenTelemetry .NET, the `TracerProvider` is still the SDK pipeline/configuration object, while it subscribes to `ActivitySource` instances and uses listeners internally. Updated the table wording to avoid implying developers replace `TracerProvider` with `ActivitySource`.
- The original text said developers use the OpenTelemetry API directly with `Tracer.StartActiveSpan()` and that it works. In current OpenTelemetry .NET guidance, manual instrumentation uses `ActivitySource`; `Tracer`/`Span` APIs are available through the OpenTelemetry API shim. Updated the wording to identify the shim and avoid implying it is the default .NET API.
- The original text said `StartActivity` returns `null` if the sampler decides not to sample the trace. Official .NET documentation states it returns `null` when there are no registered listeners or the listeners are not interested. Updated the explanation to use that documented behavior and the common OpenTelemetry case where the source is not registered.
- The original text said mismatched `ActivitySource` names mean activities are created but never exported. In the common OpenTelemetry SDK setup, an unregistered source means the SDK does not listen to that source, so `StartActivity` typically returns `null`. Updated the explanation accordingly.

## Review Notes
The code snippets use current .NET APIs such as `ActivitySource.StartActivity`, `Activity.SetTag`, `Activity.AddEvent`, `ActivityTagsCollection`, and `Activity.SetStatus`. The local environment does not have the `dotnet` CLI installed, so compilation could not be run locally; validation was performed against official API documentation and OpenTelemetry .NET guidance.
