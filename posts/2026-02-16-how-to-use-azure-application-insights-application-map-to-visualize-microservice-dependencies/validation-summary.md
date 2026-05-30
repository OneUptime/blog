# Validation Summary: How to Use Azure App Insights App Map to Visualize Microservice Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor Application Insights
- Application Map
- Distributed tracing and W3C Trace Context
- .NET Application Insights SDK
- Node.js Application Insights SDK
- Azure Monitor Application Insights Java agent
- Azure Monitor OpenTelemetry distro for Python
- KQL

## Sources Consulted
- Microsoft Learn: Application map in Azure Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-map
- Microsoft Learn: Configure Azure Monitor OpenTelemetry - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: Enable Azure Monitor OpenTelemetry for .NET, Node.js, Python, and Java applications - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable
- Microsoft Learn: Monitor .NET and Node.js applications with Application Insights Classic API - https://learn.microsoft.com/en-us/previous-versions/azure/azure-monitor/app/classic-api
- Microsoft Learn: Configure Azure Monitor Application Insights for Java - https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Microsoft Learn: Migrate from OpenCensus to Azure Monitor OpenTelemetry - https://learn.microsoft.com/en-us/azure/azure-monitor/app/migrate-to-opentelemetry

## Issues Found
- The ASP.NET Core example registered the custom telemetry initializer by configuring `TelemetryConfiguration`. Microsoft documents registering ASP.NET Core telemetry initializers in dependency injection, so the example now uses `builder.Services.AddSingleton<ITelemetryInitializer, CloudRoleNameInitializer>();`.
- The Python example used the OpenCensus Azure exporter. Microsoft now recommends migrating Python Application Insights instrumentation from OpenCensus to the Azure Monitor OpenTelemetry distro, so the example now uses `azure.monitor.opentelemetry.configure_azure_monitor()` and sets `OTEL_SERVICE_NAME` for the cloud role name.
- The distributed tracing text referred only to Application Insights SDKs and Python dependency auto-collection. It now accounts for OpenTelemetry instrumentation and the need to initialize the Python distro early.
- The multi-resource Application Map section implied that a shared Log Analytics workspace or a separate Composite Application Map feature is required. Current Microsoft documentation says Application Map can show components from separate Application Insights resources, including different subscriptions, when the user has access and telemetry is correlated.
- The clutter troubleshooting item used the label "Focus on this component." Current Application Map documentation calls this action "Filter on this node," so the wording was corrected.

## Review Notes
The Node.js sample uses the classic Application Insights SDK pattern, which is still documented under Classic API guidance, but Microsoft recommends the Azure Monitor OpenTelemetry distro for new applications. A future revision could update the Node.js example to `@azure/monitor-opentelemetry` for consistency with current onboarding guidance.
