# Validation Summary: How to Configure OpenTelemetry for Azure Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Functions
- OpenTelemetry
- Azure Monitor Application Insights
- OTLP exporters
- .NET isolated worker
- Node.js
- Python
- Azure CLI application settings

## Sources Consulted
- Microsoft Learn: Use OpenTelemetry with Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/opentelemetry-howto
- Microsoft Learn: Guide for running C# Azure Functions in the isolated worker model - https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft Learn: Enable Azure Monitor OpenTelemetry for .NET, Node.js, Python, and Java applications - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable
- Microsoft Learn: OpenTelemetry ingestion options for Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/opentelemetry-summary
- Microsoft Learn: Azure CLI `az functionapp config appsettings set` - https://learn.microsoft.com/en-us/cli/azure/functionapp/config/appsettings
- OpenTelemetry JavaScript docs: Node.js getting started and resources - https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ and https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Python docs: instrumentation - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry docs: OTLP exporter configuration - https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/

## Issues Found
- The post omitted the required Azure Functions host-level OpenTelemetry setting. Added a `host.json` snippet with `"telemetryMode": "OpenTelemetry"` because current Azure Functions documentation requires enabling OpenTelemetry output at the function app host level.
- The .NET setup described an Azure Functions OpenTelemetry extension but did not include `Microsoft.Azure.Functions.Worker.OpenTelemetry` or call `.UseFunctionsWorkerDefaults()`. Added both to align with the official .NET isolated worker OpenTelemetry guidance.
- The .NET function injected `IHttpClientFactory` but did not register it and used `PostAsJsonAsync` without the relevant namespace. Added `services.AddHttpClient()` and `using System.Net.Http.Json;`.
- The .NET function referenced `OrderRequest` and `OrderResult` without definitions. Added minimal record definitions so the example is complete enough to compile in a sample project.
- The Node.js setup used current package names mixed with older OpenTelemetry JS APIs: `new Resource(...)` and `provider.addSpanProcessor(...)` are not valid with current `@opentelemetry/*` packages. Updated the snippet to use `NodeSDK`, `resourceFromAttributes`, `spanProcessors`, and `sdk.start()`.
- The Node.js package list omitted Azure Functions OpenTelemetry instrumentation. Added `@azure/functions-opentelemetry-instrumentation` and registered `AzureFunctionsInstrumentation`.
- The examples used a custom `OTEL_API_TOKEN` variable for OTLP authentication. Replaced it with the standard `OTEL_EXPORTER_OTLP_HEADERS` setting and removed hard-coded exporter header construction so the SDK/exporter can use standard OTLP configuration.
- The OTLP endpoint example mixed a trace-specific `/v1/traces` HTTP endpoint with the generic `OTEL_EXPORTER_OTLP_ENDPOINT` setting. Split the configuration into a base endpoint plus `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` values where signal-specific HTTP endpoints are needed.
- The Application Insights wording implied a simple Application Insights-specific OTLP endpoint. Updated it to describe Azure Monitor OTLP ingestion options and the Azure Monitor exporter, which matches current Microsoft guidance.
- The Application Insights connection string placeholder was incomplete for current examples. Replaced it with a connection-string-shaped placeholder including an ingestion endpoint.
- The Function App settings omitted Python worker OpenTelemetry settings called out by Azure Functions docs. Added `PYTHON_ENABLE_OPENTELEMETRY` and `PYTHON_APPLICATIONINSIGHTS_ENABLE_TELEMETRY`.

## Review Notes
The Node.js initialization snippet was syntax-checked against the current npm packages in a temporary project. The local environment does not include the .NET SDK or Azure CLI, so the C# compilation and CLI help could not be run locally; those items were verified against Microsoft Learn documentation instead.
