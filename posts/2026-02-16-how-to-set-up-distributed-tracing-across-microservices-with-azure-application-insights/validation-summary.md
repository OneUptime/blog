# Validation Summary: How to Set Up Distributed Tracing Across Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor
- Distributed tracing
- OpenTelemetry
- W3C Trace Context
- ASP.NET Core / .NET
- Node.js
- Java Application Insights agent
- Python Flask OpenTelemetry instrumentation
- Azure Service Bus
- KQL

## Sources Consulted
- Microsoft Learn: Monitor .NET and Node.js applications with Application Insights (Classic API): https://learn.microsoft.com/en-us/azure/azure-monitor/app/asp-net-core
- Microsoft Learn: Application Insights Node.js SDK setup and distributed tracing: https://learn.microsoft.com/en-us/azure/application-insights/app-insights-nodejs
- Microsoft Learn: Configure Azure Monitor Application Insights for Java: https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Microsoft Learn: Collect telemetry with OpenTelemetry in Application Insights: https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-overview
- Microsoft Learn: Configure Azure Monitor OpenTelemetry: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: AzureMonitorTraceExporter Python API: https://learn.microsoft.com/en-us/python/api/azure-monitor-opentelemetry-exporter/azure.monitor.opentelemetry.exporter.azuremonitortraceexporter
- Microsoft Learn: Sampling in Application Insights: https://learn.microsoft.com/en-us/previous-versions/azure/azure-monitor/app/sampling-classic-api
- Microsoft Learn: Kusto `arg_max()` aggregation function: https://learn.microsoft.com/en-us/kusto/query/arg-max-aggregation-function
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- GitHub: Microsoft ApplicationInsights-Java releases: https://github.com/microsoft/ApplicationInsights-Java/releases

## Issues Found
- The Java agent download command used the older `3.4.0` agent. Updated it to `3.7.5`, matching the current Microsoft Learn Java agent examples consulted during review.
- The Java `applicationinsights.json` sampling example incorrectly nested `sampling` under `preview`. Moved `sampling` to the documented top-level configuration key.
- The Java configuration snippet was fenced as JSON but contained a `//` comment. Moved the comment outside the JSON block so the snippet is valid JSON.
- The OpenTelemetry section said Application Insights supports OTLP ingestion without caveat. Updated the wording to distinguish supported Azure Monitor OpenTelemetry distributions/exporters from native Azure Monitor OTLP ingestion, which is currently preview.
- The Python Azure Monitor exporter example used the constructor directly with a connection string. Updated it to use `AzureMonitorTraceExporter.from_connection_string()`, which Microsoft documents as the recommended explicit connection-string path.
- The Azure Service Bus consumer comment said it created a linked span, but the code creates a child activity. Updated the comment and made traceparent extraction safer with `TryGetValue` and a non-empty check.
- The KQL query aliased `arg_max()` as a scalar, which is misleading because `arg_max()` returns selected columns from the row with the maximum value. Updated the query to use `arg_max()` in `summarize` and then project the slowest dependency fields.
- The fixed-rate sampling example instantiated a sampling processor but never added it to the Application Insights telemetry processor chain. Replaced it with the documented `TelemetryProcessorChainBuilder.UseSampling(...)` pattern and disabled adaptive sampling for that fixed-rate configuration.
- The sampling explanation claimed downstream services automatically respect the first service's sampling decision. Updated it to say sampling should be configured consistently and that inconsistent per-service sampling can break the end-to-end view.

## Review Notes
- Microsoft currently recommends the Azure Monitor OpenTelemetry Distro for new applications, while the classic Application Insights SDK examples remain valid for existing .NET and Node.js SDK-based setups.
- The article intentionally stays high-level for manual context propagation. In production .NET code, prefer established `ActivitySource` instrumentation patterns and Azure SDK auto-instrumentation where available.
