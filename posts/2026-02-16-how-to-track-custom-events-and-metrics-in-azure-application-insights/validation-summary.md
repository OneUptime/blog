# Validation Summary: How to Track Custom Events and Metrics in Azure Application Insights

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor
- Log Analytics / KQL
- .NET Application Insights SDK
- Node.js Application Insights SDK
- Azure Monitor OpenTelemetry Distro for Python
- Java Application Insights SDK

## Sources Consulted
- Microsoft Learn: Monitor .NET and Node.js applications with Application Insights (Classic API 2.x) - https://learn.microsoft.com/en-us/previous-versions/azure/azure-monitor/app/classic-api
- Microsoft Learn: Add and modify Azure Monitor OpenTelemetry for .NET, Java, Node.js, and Python applications - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify
- Microsoft Learn: Configuring OpenTelemetry in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft ApplicationInsights Node.js SDK repository documentation - https://github.com/microsoft/ApplicationInsights-node.js/

## Issues Found
- The Python metrics example used OpenCensus-style APIs and imported an Azure metrics exporter without configuring or using it. OpenCensus is no longer the current recommended path for Azure Monitor Application Insights. Replaced the snippet with an Azure Monitor OpenTelemetry Distro example using `configure_azure_monitor()` and an OpenTelemetry observable gauge.
- The Python custom events example used the legacy `applicationinsights` package with an instrumentation key. Replaced it with the current Azure Monitor OpenTelemetry Distro logging approach using the `microsoft.custom_event.name` attribute and a connection string.
- The performance section said custom events and metrics are subject to sampling. Corrected this to state that custom events can be sampled, while metrics are not sampled in the Azure Monitor OpenTelemetry guidance and Application Insights metric APIs.
- The exit guidance specifically said to call `Flush()`, which is SDK-specific. Generalized it to flushing or shutting down the telemetry pipeline so it applies across SDKs.
- Added a note that the .NET `TelemetryClient` examples use the classic SDK and that Microsoft recommends Azure Monitor OpenTelemetry Distro for new .NET applications.

## Review Notes
The .NET and Java `TelemetryClient` examples are valid for existing applications that use those SDKs, but Microsoft is steering new applications toward Azure Monitor OpenTelemetry-based instrumentation. A future rewrite could make the whole article OpenTelemetry-first across .NET, Node.js, Python, and Java.
