# Validation Summary: How to Troubleshoot High Memory Usage in .NET OpenTelemetry When Histogram

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry .NET SDK
- .NET metrics API
- OpenTelemetry metric Views
- Explicit bucket histograms
- Base2 exponential histograms
- ASP.NET Core request routing
- .NET garbage collection memory APIs

## Sources Consulted
- OpenTelemetry .NET metrics documentation: https://opentelemetry.io/docs/languages/dotnet/metrics/
- OpenTelemetry .NET metrics best practices: https://opentelemetry.io/docs/languages/dotnet/metrics/best-practices/
- OpenTelemetry .NET SDK metrics customization documentation: https://github.com/open-telemetry/opentelemetry-dotnet/tree/main/docs/metrics/customizing-the-sdk
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- Microsoft .NET metrics instrumentation documentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- ASP.NET Core routing endpoint metadata API: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing
- .NET GC memory APIs: https://learn.microsoft.com/en-us/dotnet/api/system.gc.getgcmemoryinfo

## Issues Found
- The introduction implied that each unique combination of bucket boundaries and attributes creates state. Clarified that aggregation state is kept per metric stream and unique attribute set, with bucket configuration affecting the amount of histogram state per set.
- The histogram memory explanation described histograms as only storing bucket counts. Updated it to mention count, sum, min, max, and bucket counts, matching the OpenTelemetry Metrics SDK aggregation model.
- The exponential histogram section implied that switching to base2 exponential histograms is inherently more memory-efficient and used the default `MaxSize = 160`. Updated the wording to describe exponential histograms as a tunable alternative for wide dynamic ranges, and changed the example to a smaller `MaxSize` with a more precise comment.

## Review Notes
The remaining code examples use current OpenTelemetry .NET view APIs such as `MetricStreamConfiguration.TagKeys`, `ExplicitBucketHistogramConfiguration.Boundaries`, `Base2ExponentialBucketHistogramConfiguration`, and `MetricStreamConfiguration.CardinalityLimit`. The local environment does not have the `dotnet` CLI installed, so snippets were reviewed against official documentation and API references rather than compiled locally.
