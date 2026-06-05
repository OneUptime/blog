# Validation Summary: How to Replace Azure Application Insights SDK with OpenTelemetry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor OpenTelemetry Distro
- OpenTelemetry SDKs and APIs
- .NET / ASP.NET Core
- Node.js
- Python
- OpenTelemetry Collector
- OTLP exporters

## Sources Consulted
- Microsoft Learn: OpenTelemetry on Azure - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry
- Microsoft Learn: Enable Azure Monitor OpenTelemetry for .NET, Node.js, Python, and Java applications - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable
- Microsoft Learn: Azure Monitor Exporter client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/monitor.opentelemetry.exporter-readme
- Microsoft Learn: Azure Monitor OpenTelemetry for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/monitor-opentelemetry-readme
- Microsoft Learn: Azure Monitor OpenTelemetry Exporter client library for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/monitor-opentelemetry-exporter-readme
- Microsoft Learn: Azure Monitor OpenTelemetry Distro client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/monitor-opentelemetry-readme
- Microsoft Learn: Microsoft OpenTelemetry exporter for Azure Monitor Python - https://learn.microsoft.com/en-us/python/api/overview/azure/monitor-opentelemetry-exporter-readme
- Microsoft Learn: Ingest OTLP data into Azure Monitor by using OTel Collector - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/opentelemetry-protocol-ingestion
- OpenTelemetry Docs: JavaScript instrumentation - https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Docs: .NET instrumentation - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- Microsoft Learn: ActivitySource.StartActivity API - https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity
- Microsoft Learn: Meter API - https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.meter

## Issues Found
- The Node.js installation command did not include `@opentelemetry/resources` or `@opentelemetry/sdk-trace-base`, even though the code imported from those packages. Added the missing packages.
- The Node.js sample used `new Resource(...)`, while current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`. Updated the import and resource construction.
- The .NET custom telemetry sample called `ActivitySource.StartActivity(...)` as if it were a static method. Updated it to create an `ActivitySource` instance and call `activitySource.StartActivity(...)`.
- The .NET setup did not register the custom `ActivitySource` or `Meter` used later in the manual telemetry examples. Added `.AddSource("MyApp.Orders")` and `.AddMeter("MyApp.Orders")`.
- The Application Insights to OpenTelemetry mapping table used generic/lowercase span method names for .NET examples. Updated the exception and event mappings to `Activity.RecordException()` and `Activity.AddEvent()`.
- The Python install command used only the lower-level Azure Monitor exporter package. Updated it to install the current Azure Monitor OpenTelemetry distro plus OTLP exporter support, matching Microsoft guidance for the migration path described by the post.
- The OpenTelemetry Collector configuration used an older `azuremonitor` exporter with an Application Insights connection string. Current Azure Monitor OTLP ingestion guidance uses OTLP/HTTP endpoints with Azure authentication and DCR-derived endpoints. Replaced the Azure Monitor exporter configuration with `otlphttp/azuremonitor`, Azure authentication extension configuration, and endpoint placeholders.
- The summary claimed that standard SDKs plus the Azure Monitor exporter give full compatibility for other languages. Adjusted the wording to refer to Microsoft-published distro and exporter packages, which is more accurate across Node.js and Python.

## Review Notes
- The post is technically relevant and contains implementation guidance, so it was reviewed as a code/tutorial post.
- The manual .NET `ActivitySource` and `Meter` examples are now technically correct, but production code should usually keep these objects as long-lived shared instances instead of creating them inside each operation.
- The JavaScript Azure Monitor exporter remains documented under the Azure Node preview documentation view, while the full `@azure/monitor-opentelemetry` distro is the primary Microsoft-recommended package for most Node.js Azure Monitor scenarios.
