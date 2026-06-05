# Validation Summary: How to Instrument .NET MAUI Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET MAUI
- OpenTelemetry .NET
- OTLP exporter
- HttpClient instrumentation
- C#
- Android WorkManager
- Mobile app lifecycle and connectivity APIs

## Sources Consulted
- Microsoft Learn: .NET MAUI app lifecycle - https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/app-lifecycle
- Microsoft Learn: .NET MAUI dependency injection - https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/dependency-injection
- Microsoft Learn: .NET MAUI NavigationPage navigation events - https://learn.microsoft.com/en-us/dotnet/maui/user-interface/pages/navigationpage
- Microsoft Learn: dotnet package add / dotnet add package CLI behavior - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- OpenTelemetry .NET instrumentation docs - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exception reporting docs - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry OTLP exporter specification - https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- NuGet/OpenTelemetry.Instrumentation.Http package documentation - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- Android Developers: WorkManager API reference - https://developer.android.com/reference/androidx/work/WorkManager

## Issues Found
- The OpenTelemetry setup registered custom sources and meters with broad wildcard strings. I changed the examples to register the concrete `ActivitySource` and `Meter` names used later in the post, matching the explicit registration style shown in OpenTelemetry .NET documentation.
- The page instrumentation example resolved `ITelemetryService` from `Handler?.MauiContext` in the page constructor. In .NET MAUI the handler can be null in the constructor; Microsoft documents using `HandlerChanged` for explicit resolution or constructor injection. I changed the base page to accept `ITelemetryService` through constructor injection.
- The navigation example used `args.NavigationMode`, which is not a .NET MAUI `NavigatedToEventArgs` property. I changed it to `args.NavigationType`, which is the documented property.
- Several code snippets used `Meter`, `Counter`, `Histogram`, `ObservableCollection`, `JsonSerializer`, or `Activity.RecordException()` without the necessary namespaces. I added the relevant `using` statements, including `System.Diagnostics.Metrics`, `System.Collections.ObjectModel`, `System.Text.Json`, and `OpenTelemetry.Trace`.
- The offline buffer stored `Activity` objects and later claimed to re-export them. That is not a valid OpenTelemetry .NET export pattern because ended/disposed activities are exported by the SDK pipeline, not manually re-exported from a queue. I changed the example to an in-memory callback buffer for the telemetry service's tracked page views, events, and exceptions.

## Review Notes
The examples are still illustrative and omit app-specific registrations for pages, view models, HTTP clients, and product services. The manual HTTP wrapper plus automatic HttpClient instrumentation can create duplicate HTTP spans if both are used for the same request path; a production app should choose one approach or use the wrapper only for additional business attributes. I could not run a local compile check because the `dotnet` CLI is not installed in this environment.
