# Validation Summary: How to Use .NET Built-In Diagnostics APIs with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET System.Diagnostics.Activity and ActivitySource
- .NET System.Diagnostics.Metrics and IMeterFactory
- OpenTelemetry .NET tracing and metrics SDK
- OpenTelemetry semantic conventions
- W3C Trace Context propagation
- C# and ASP.NET Core

## Sources Consulted
- Microsoft Learn: Add distributed tracing instrumentation in .NET - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Learn: Creating metrics in .NET - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- Microsoft Learn: Activity.AddException API - https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception
- Microsoft Learn: .NET observability with OpenTelemetry - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel
- OpenTelemetry .NET instrumentation docs - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET traces getting started - https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-console/
- OpenTelemetry .NET SDK customization docs - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry HTTP span semantic conventions - https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP metric semantic conventions - https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- W3C Trace Context specification - https://www.w3.org/TR/trace-context/

## Issues Found
- The OpenTelemetry resource configuration used `.AddService("DiagnosticsDemo", "1.0.0")`, which passes `"1.0.0"` as the service namespace rather than the service version. Changed it to `.AddService("DiagnosticsDemo", serviceVersion: "1.0.0")`.
- The HTTP span tags used older semantic convention names (`http.url`, `http.method`, and `http.status_code`). Updated them to `url.full`, `http.request.method`, and `http.response.status_code`.
- The HTTP request duration metric used milliseconds for `http.server.request.duration`, but the OpenTelemetry HTTP metric semantic convention uses seconds. Changed the unit to `s` and recorded `TotalSeconds`.
- The active requests metric name used `http.server.requests.active`; the current HTTP metric semantic convention uses `http.server.active_requests`. Updated the metric name.
- The custom sampler attempted to always sample errors by reading an `error` tag at sampling time. Head sampling decisions happen when the activity is created, before later error status or exception tags are known. Changed the example to sample activities marked with a creation-time `sampling.priority=critical` tag and delegate normal sampling to `TraceIdRatioBasedSampler`.
- The best-practice section recommended static readonly fields for both ActivitySources and Meters. Clarified that ActivitySources are commonly static readonly, while Meters created through `IMeterFactory` can be held by long-lived services and disposed by the DI container.

## Review Notes
- The post is technically relevant and accurate after the corrections above.
- Local compilation was not run because the `dotnet` CLI is not installed in this environment.
