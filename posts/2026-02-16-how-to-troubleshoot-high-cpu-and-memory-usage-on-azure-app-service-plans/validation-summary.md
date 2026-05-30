# Validation Summary: How to Troubleshoot High CPU and Memory Usage on Azure App Service Plans

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure App Service Plans
- App Service Diagnostics
- Kudu / Advanced Tools
- Application Insights Profiler
- ASP.NET Core / .NET
- HttpClient / IHttpClientFactory
- ASP.NET Core MemoryCache
- Azure SQL Database / SQL Server dynamic management views
- Azure CLI
- Azure Monitor Autoscale
- App Service Auto-Heal

## Sources Consulted
- Azure App Service diagnostics overview: https://learn.microsoft.com/azure/app-service/overview-diagnostics
- Troubleshoot slow App Service performance: https://learn.microsoft.com/troubleshoot/azure/app-service/troubleshoot-performance-degradation
- Azure App Service quotas and metrics: https://learn.microsoft.com/azure/app-service/web-sites-monitor
- Supported metrics for Microsoft.Web/serverfarms: https://learn.microsoft.com/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- Application Insights Profiler for .NET containers / ASP.NET Core setup: https://learn.microsoft.com/azure/azure-monitor/profiler/profiler-containers
- .NET createdump troubleshooting guidance: https://learn.microsoft.com/troubleshoot/developer/webapps/aspnetcore/practice-troubleshoot-linux/lab-2-1-capture-dumps-createdump
- .NET dump collection and analysis utility: https://learn.microsoft.com/dotnet/core/diagnostics/dotnet-dump
- ASP.NET Core in-memory caching: https://learn.microsoft.com/aspnet/core/performance/caching/memory
- IHttpClientFactory guidance: https://learn.microsoft.com/dotnet/core/extensions/httpclient-factory
- HttpClientFactory resilient HTTP requests guidance: https://learn.microsoft.com/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests
- Application Insights dependency tracking: https://learn.microsoft.com/azure/azure-monitor/app/dependencies
- SQL Server missing index DMV documentation: https://learn.microsoft.com/sql/relational-databases/system-dynamic-management-views/sys-dm-db-missing-index-group-stats-transact-sql
- Azure CLI autoscale command reference: https://learn.microsoft.com/cli/azure/monitor/autoscale
- Azure CLI autoscale rule command reference: https://learn.microsoft.com/cli/azure/monitor/autoscale/rule
- App Service auto-heal trigger model: https://learn.microsoft.com/javascript/api/@azure/arm-appservice-profile-2020-09-01-hybrid/autohealtriggers

## Issues Found
- The profiling section implied Auto-Heal was an equivalent profiling option for non-.NET runtimes. Updated the wording to describe Auto-Heal as a mitigation and direct other runtimes to runtime-specific diagnostic tools.
- The Application Insights Profiler code omitted the required profiler package context. Added the `Microsoft.ApplicationInsights.Profiler.AspNetCore` package requirement.
- The `createdump` command used a non-documentation argument order. Updated it to the documented `createdump <PID> -f <filepath>` form and used `%d` in the output file name.
- The synchronous blocking section overstated blocking async calls as the most common cause of high CPU. Reworded it as a common performance problem that can cause thread pool starvation, latency, and CPU overhead.
- The `MemoryCache` `SizeLimit` comment described the limit as a maximum number of cache entries. ASP.NET Core treats cache size as arbitrary units, so the comment now explains that it behaves like an entry count only when each entry uses `Size = 1`.
- The Azure Monitor autoscale example used `--autoscale-name myAutoscaleRule`, but that parameter expects the autoscale setting name, not a rule name. Added a setting name to `az monitor autoscale create` and reused it in `az monitor autoscale rule create`.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI syntax was verified against the official Microsoft Learn command reference rather than local `az --help` output.
- The examples are generally accurate for modern ASP.NET Core and Azure App Service, but dump collection and profiling availability can vary by OS, runtime, plan, permissions, and whether the app runs in Windows, Linux, or a custom container.
