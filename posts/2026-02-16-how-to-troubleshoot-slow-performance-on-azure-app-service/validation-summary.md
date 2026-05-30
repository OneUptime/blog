# Validation Summary: How to Troubleshoot Slow Performance on Azure App Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure App Service diagnostics
- Azure Monitor metrics and alerts
- Application Insights Profiler and dependency tracking
- Kudu / SCM site diagnostics
- Azure CLI
- .NET SqlConnection usage
- Node.js memory leak patterns
- Azure Managed Redis

## Sources Consulted
- Microsoft Learn: Azure App Service quotas and metrics - https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor
- Microsoft Learn: Supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Microsoft Learn: Supported metrics for Microsoft.Web/serverfarms - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- Microsoft Learn: Troubleshoot slow app performance issues in Azure App Service - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/troubleshoot-performance-degradation
- Microsoft Learn: Diagnostics in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-diagnostics
- Microsoft Learn: Capture memory dumps on the Azure App Service platform - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/capture-memory-dumps-app-service
- Kudu Wiki: Process Threads list and minidump/gcdump/diagsession - https://github.com/projectkudu/kudu/wiki/Process-Threads-list-and-minidump-gcdump-diagsession
- Microsoft Learn: Dependency tracking in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/dependencies
- Microsoft Learn: Configure an App Service app - https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: az appservice plan CLI reference - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: Azure Cache for Redis documentation - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/

## Issues Found
- The CPU diagnostic section referred to "Auto-Heal CPU Profiling" and said it could collect a profiling trace for high CPU. Updated this to "Proactive CPU Monitoring" and described collecting memory dumps based on a CPU threshold, matching current App Service diagnostics documentation.
- The Kudu memory dump API example used `POST /api/processes/0/dump?dumpType=2`. Updated it to the documented diagnostics endpoint, `GET /api/diagnostics/processes/<process-id>/dump?dumpType=2`, using the actual process ID placeholder.
- The noisy-neighbor section included Basic plans as shared with other tenants. Updated it to Free and Shared plans only, and noted that Basic, Standard, and Premium plans use plan size and instance count for dedicated compute resources.
- The caching bullet used the outdated service name "Azure Redis Cache." Updated it to Azure Managed Redis, the current Microsoft-recommended Redis offering.

## Review Notes
The Azure CLI commands use valid `az appservice plan show` and `az appservice plan update` parameters. Application Insights dependency tracking, App Service metrics, Always On behavior, and App Service scaling guidance are consistent with current Microsoft documentation. Application Insights Profiler has service-plan and runtime limitations that could be worth expanding in a future revision, but the existing high-level guidance is technically correct.
