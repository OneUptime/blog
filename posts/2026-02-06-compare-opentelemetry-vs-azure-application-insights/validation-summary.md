# Validation Summary: How to Compare OpenTelemetry vs Azure Application Insights

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor OpenTelemetry Distro
- OpenTelemetry .NET
- Azure Monitor OpenTelemetry Exporter for .NET
- Application Insights Java agent
- OpenTelemetry Java agent
- OpenTelemetry Collector
- Grafana Tempo and Jaeger
- KQL and Azure Monitor Logs

## Sources Consulted
- Microsoft Learn: OpenTelemetry on Azure: https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry
- Microsoft Learn: Enable Azure Monitor OpenTelemetry for .NET, Node.js, Python, and Java applications: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable
- Microsoft Learn: Configure Azure Monitor OpenTelemetry: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: Add and Modify OpenTelemetry in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify
- Microsoft Learn: Application Insights FAQ: https://learn.microsoft.com/en-us/azure/azure-monitor/app/application-insights-faq
- Microsoft Learn: Configure Azure Monitor Application Insights for Java: https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Microsoft Azure: Azure Monitor pricing: https://azure.microsoft.com/en-us/pricing/details/monitor/
- OpenTelemetry docs: Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry docs: Collector exporters: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry docs: Transforming telemetry with the Collector filter processor: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Contrib: Azure Monitor exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter

## Issues Found
- The .NET Azure Monitor OpenTelemetry Distro snippet used `TracerProvider.GetTracer()` and `StartActiveSpan()`, but official .NET guidance uses `System.Diagnostics.ActivitySource` and `Activity` for custom spans. Replaced the snippet with `ActivitySource`, `ConfigureOpenTelemetryTracerProvider(...AddSource(...))`, and `SetTag()`.
- The classic Application Insights snippet used `DependencyTelemetry` without its required namespace. Added `Microsoft.ApplicationInsights.DataContracts`.
- The convergence section overstated JavaScript support. Updated it to server-side .NET, Java, Node.js, and Python and added a supported-scenarios caveat.
- The Java agent config block was labeled YAML even though it was JSON. Changed the fence to `json` and removed non-JSON comments from the snippet.
- The Live Metrics comparison implied standalone Azure Monitor exporter support. Clarified that Live Metrics is available via the distro, not the standalone .NET exporter.
- The pricing section used a fixed per-GB price. Reworded it to reflect Microsoft's current model: Application Insights is billed through Log Analytics, the pay-as-you-go tier includes 5 GB/month per billing account, and additional ingestion varies by region and tier.
- The OpenTelemetry Collector example used a filter condition that would drop critical spans rather than route them. Changed it to drop noncritical spans from the Azure Monitor pipeline and added `error_mode: ignore`.
- The Collector Azure Monitor exporter was presented without support caveats. Added a note that it is a community Collector component, not Microsoft's recommended Application Insights instrumentation path.
- The migration step called the distro a drop-in replacement and referred generically to tracers in .NET. Adjusted the wording to a similar Application Insights experience and named .NET-compatible APIs such as `ActivitySource`, `Meter`, and logging APIs.

## Review Notes
The post is technically relevant and current after the corrections. Future updates should revisit Azure Monitor pricing and the Azure Monitor/OpenTelemetry product naming, because Microsoft is actively evolving supported distro and ingestion paths.
