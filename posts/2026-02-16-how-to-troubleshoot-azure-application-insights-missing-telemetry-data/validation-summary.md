# Validation Summary: How to Troubleshoot Azure Application Insights Missing Telemetry Data

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor
- Azure CLI
- .NET Application Insights SDK
- Node.js Application Insights SDK
- Java Application Insights agent
- Azure Functions
- Azure Monitor OpenTelemetry for Python
- Kubernetes command-line troubleshooting

## Sources Consulted
- Microsoft Learn: Connection strings in Application Insights - https://learn.microsoft.com/azure/azure-monitor/app/connection-strings
- Microsoft Learn: Azure Monitor endpoint access and firewall configuration - https://learn.microsoft.com/azure/azure-monitor/fundamentals/azure-monitor-network-access
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference - https://learn.microsoft.com/cli/azure/monitor/app-insights/component
- Microsoft Learn: Azure CLI `az monitor app-insights query` reference - https://learn.microsoft.com/cli/azure/monitor/app-insights
- Microsoft Learn: Azure CLI `az monitor app-insights component quotastatus` reference - https://learn.microsoft.com/cli/azure/monitor/app-insights/component/quotastatus
- Microsoft Learn: Azure CLI `az monitor app-insights component billing` reference - https://learn.microsoft.com/cli/azure/monitor/app-insights/component/billing
- Microsoft Learn: Configure monitoring for Azure Functions - https://learn.microsoft.com/azure/azure-functions/configure-monitoring
- Microsoft Learn: App settings reference for Azure Functions - https://learn.microsoft.com/azure/azure-functions/functions-app-settings
- Microsoft Learn: Monitor .NET and Node.js applications with Application Insights - https://learn.microsoft.com/azure/azure-monitor/app/asp-net-core
- Microsoft Learn: Monitor Node.js applications with Application Insights - https://learn.microsoft.com/azure/application-insights/app-insights-nodejs
- Microsoft Learn: Configure Azure Monitor OpenTelemetry - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: Azure Monitor OpenTelemetry Distro for Python - https://learn.microsoft.com/python/api/overview/azure/monitor-opentelemetry-readme
- Microsoft Learn: Collect self-diagnostic logs for Application Insights SDKs - https://learn.microsoft.com/troubleshoot/azure/azure-monitor/app-insights/telemetry/enable-self-diagnostics
- Microsoft Learn: Application Insights managed workspaces - https://learn.microsoft.com/azure/azure-monitor/app/managed-workspaces

## Issues Found
- The post described instrumentation keys only as legacy. I clarified that instrumentation key ingestion is no longer supported for updates and that connection strings are recommended.
- The post stated broadly that Application Insights uses adaptive sampling by default. I narrowed the claim to common SDK integrations such as the classic ASP.NET Core SDK and Azure Functions host, since OpenTelemetry-based defaults vary by language and version.
- The ingestion check used `az monitor app-insights metrics show --metrics "exceptions/count"`, which checks application exception metrics rather than whether telemetry is arriving. I replaced it with an Application Insights Logs query over recent requests.
- The network endpoint list used `rt.applicationinsights.azure.com` for profiler and snapshot debugger. I replaced it with the documented `profiler.monitor.azure.com` and `snapshot.monitor.azure.com` endpoints.
- The daily cap command used billing settings to imply current quota usage. I replaced it with `az monitor app-insights component quotastatus show`, which is the documented CLI command for daily cap quota status.
- The Python SDK version guidance used `opencensus-ext-azure`. I updated it to `azure-monitor-opentelemetry`, the current Azure Monitor OpenTelemetry distro package.
- The dependency tracking section implied ASP.NET Core SQL/EF Core dependency tracking requires adding `Microsoft.ApplicationInsights.DependencyCollector`. I clarified that ASP.NET Core gets dependency tracking through `AddApplicationInsightsTelemetry()` and that the dependency collector package applies to non-ASP.NET Core classic SDK scenarios.
- The .NET self-diagnostics example used an older telemetry module configuration pattern. I replaced it with the documented `ApplicationInsightsDiagnostics.json` self-diagnostics configuration.

## Review Notes
The post still uses several classic Application Insights SDK examples. They are technically valid for existing applications, but future revisions should consider presenting Azure Monitor OpenTelemetry as the primary path for new .NET, Node.js, Python, and Java instrumentation.
