# Validation Summary: How to Use Azure Application Insights to Monitor Azure Functions Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure Application Insights
- Azure Monitor
- Azure CLI
- Kusto Query Language (KQL)
- C# Azure Functions isolated worker
- JavaScript/Node.js Azure Functions
- Durable Functions
- host.json monitoring configuration

## Sources Consulted
- Azure Functions monitoring overview: https://learn.microsoft.com/en-us/azure/azure-functions/functions-monitoring
- Azure Functions host.json reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Azure Functions .NET isolated worker guide: https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft.Azure.Functions.Worker.ApplicationInsights package README: https://www.nuget.org/packages/Microsoft.Azure.Functions.Worker.ApplicationInsights
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-nz/azure/azure-functions/functions-reference-node
- Durable Functions diagnostics: https://learn.microsoft.com/en-us/azure/azure-functions/durable-functions/durable-functions-diagnostics
- Azure CLI Application Insights component reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Azure Functions scale and hosting: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Azure Functions Premium plan: https://learn.microsoft.com/en-ca/azure/azure-functions/functions-premium-plan
- Azure Functions app settings reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings

## Issues Found
- The cold-start mitigation list incorrectly suggested using `WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT` as a cold-start control. I changed this to recommend Premium or Flex Consumption always-ready instances, Dedicated plans with Always On, and warmup triggers where supported. I also clarified that scale-out limits are for protecting downstream systems, not reducing cold starts.
- The C# isolated worker custom telemetry example injected `TelemetryClient` without showing the required Application Insights worker registration. I added the required packages and `Program.cs` registration with `AddApplicationInsightsTelemetryWorkerService()` and `ConfigureFunctionsApplicationInsights()`.
- The C# snippet omitted core `using` directives needed for the shown `Task` and `Dictionary` types. I added `System.Threading.Tasks` and `System.Collections.Generic`.
- The Node.js custom telemetry example assumed the Functions runtime initializes the Application Insights Node.js SDK. I changed it to explicitly call `appInsights.setup()`, create a global default client, and use `tagOverrides` so custom telemetry correlates with the function invocation.
- The Durable Functions query used the `requests` table and a function-name prefix assumption. I replaced it with a query against `traces` filtered to `Host.Triggers.DurableTask` tracking events, matching the Durable Functions diagnostics guidance.

## Review Notes
- Microsoft now recommends OpenTelemetry with the Azure Monitor exporter for new and existing Azure Functions telemetry customization. The classic Application Insights SDK examples are still usable for custom telemetry, but they are legacy and should be migrated to OpenTelemetry over time.
- The Azure CLI command syntax matches the official CLI reference, but `az` was not installed in the local environment, so local `--help` verification was not available.
