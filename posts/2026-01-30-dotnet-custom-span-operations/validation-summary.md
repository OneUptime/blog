# Validation Summary: How to Build Custom Span Operations in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- OpenTelemetry .NET
- System.Diagnostics.ActivitySource
- System.Diagnostics.Activity
- ASP.NET Core dependency injection
- OTLP exporter
- xUnit

## Sources Consulted
- Microsoft Learn: Adding distributed tracing instrumentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Learn: Activity.AddException API reference: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception
- Microsoft Learn: dotnet package add command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- OpenTelemetry .NET SDK customization docs: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry .NET ActivityExtensions source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Api/Trace/ActivityExtensions.cs
- OpenTelemetry .NET exception reporting docs: https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/

## Issues Found
- The NuGet install commands used the older `dotnet add package` command form. Current .NET CLI documentation uses `dotnet package add` for .NET 10 and later, with `dotnet add package` retained for .NET 9 and earlier. Updated the commands to the current form.
- The samples used `Activity.RecordException()`, which is now marked obsolete in the OpenTelemetry .NET API source in favor of `Activity.AddException()`. Replaced both calls with `Activity.AddException()`.
- The payment card token prefix example used `cardToken.Substring(0, 4)`, which throws if the token is shorter than four characters. Updated it to safely return the whole token when shorter than four characters.
- `BatchSpanOperation.RecordProgress` divided by `totalItems` without guarding against zero or negative values. Added a guard to avoid divide-by-zero errors.
- `BatchSpanOperation` computed `items_per_second` by dividing by elapsed milliseconds without checking for zero elapsed time. Added an elapsed-time check so fast operations do not produce invalid rate values.

## Review Notes
- I could not compile the C# snippets locally because the `dotnet` SDK is not installed in this environment. The API and command checks were performed against official Microsoft and OpenTelemetry documentation/source.
- The OpenTelemetry exception reporting docs still show `RecordException()`, but the current OpenTelemetry .NET source marks it obsolete and delegates to `Activity.AddException()`.
