# Validation Summary: How to Monitor Azure Functions Performance with Application Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure Application Insights
- Azure Monitor
- Azure CLI
- .NET isolated worker model
- C#
- host.json
- Kusto Query Language (KQL)

## Sources Consulted
- Azure Functions .NET isolated worker guide: https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Azure Functions monitoring configuration: https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring
- Azure Functions host.json reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Azure Functions telemetry in Application Insights: https://learn.microsoft.com/en-us/azure/azure-functions/analyze-telemetry-data
- Application Insights resource creation and connection strings: https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Azure CLI Application Insights component reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Azure CLI metric alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Supported Application Insights metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-insights-components-metrics
- Application Insights metrics overview: https://learn.microsoft.com/en-us/azure/azure-monitor/app/metrics-overview
- Application Insights classic API custom metrics and requests: https://learn.microsoft.com/en-us/azure/azure-monitor/app/get-metric

## Issues Found
- The .NET isolated worker setup omitted the required Application Insights worker package context and the namespace needed for `AddApplicationInsightsTelemetryWorkerService()`. I added a sentence naming the required packages and updated the using directives.
- The logging example claimed application logs would be kept at `Information`, but the Application Insights worker SDK adds a default provider filter that captures only `Warning` and above unless explicitly removed. I added the documented `LoggerFilterOptions` override before setting log levels.
- The custom telemetry sample injected `_paymentClient` without declaring or assigning it and referenced validation/fulfillment methods without placeholders. I added constructor injection for `IPaymentClient` and minimal placeholder methods so the example is structurally correct.
- The alert labeled "failure rate exceeds 5%" used the metric condition `count requests/failed > 5`, which alerts on failed-request count, not a percentage rate. I changed the alert name, comment, and description to describe failed-request count accurately.

## Review Notes
- The KQL examples use classic Application Insights table names such as `requests`, `dependencies`, `traces`, and `exceptions`, which remain valid in Application Insights Logs. Workspace-based table names such as `AppRequests` can also appear depending on the query surface.
- The post uses connection strings instead of instrumentation keys, which matches current Azure Functions guidance.
- The `host.json` Application Insights sampling, Live Metrics, and HTTP auto-collection fields match the Azure Functions host.json reference.
