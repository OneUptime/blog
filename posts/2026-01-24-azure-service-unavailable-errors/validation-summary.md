# Validation Summary: How to Fix 'Service Unavailable' Errors in Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure Functions
- Azure Kubernetes Service
- Azure Application Gateway
- Azure Front Door
- Azure Monitor metrics and alerts
- Azure Resource Health
- Azure Traffic Manager
- ASP.NET Core
- Node.js Express
- Polly
- Opossum

## Sources Consulted
- Azure CLI reference: az webapp log - https://learn.microsoft.com/en-us/cli/azure/webapp/log?view=azure-cli-latest
- Azure CLI reference: az webapp config set - https://learn.microsoft.com/en-us/cli/azure/webapp/config?view=azure-cli-latest
- Azure CLI reference: az appservice plan update - https://learn.microsoft.com/en-us/cli/azure/appservice/plan?view=azure-cli-latest
- Azure CLI reference: az monitor autoscale and autoscale rule - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale?view=azure-cli-latest and https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule?view=azure-cli-latest
- Azure Monitor supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Azure Monitor supported metrics for Microsoft.Web/serverfarms - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- App Service Health check documentation - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Azure Resource Health REST API: Availability Statuses - https://learn.microsoft.com/en-us/rest/api/resourcehealth/availability-statuses/get-by-resource?view=rest-resourcehealth-2025-05-01
- Azure Traffic Manager CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile?view=azure-cli-latest
- ASP.NET Core Health Checks documentation - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks

## Issues Found
- The post used the nonexistent `az webapp log show-container-logs` command. Replaced it with the documented `az webapp log tail` command for live log inspection.
- The App Service metric examples used `Http503`, which is not a supported Microsoft.Web/sites metric. Replaced it with `Http5xx` and clarified that this includes 503 responses.
- The resource usage command queried `CpuPercentage`, `MemoryPercentage`, and `Connections` on the web app resource. Updated it to query `CpuPercentage` and `MemoryPercentage` on the App Service plan resource and `AppConnections` on the web app resource.
- The scale-out command used `az webapp scale`, which is documented for Arc-enabled Kubernetes workloads rather than normal App Service scale-out. Replaced it with `az appservice plan update --number-of-workers 3`.
- The Always On example used a generic `az webapp update --set siteConfig.alwaysOn=true` pattern under an inaccurate "Scale up" comment. Replaced it with the documented `az webapp config set --always-on true` command and corrected the comment.
- The health check configuration used `--health-check-path`, which is not listed in the current `az webapp config set` options. Replaced it with `--generic-configurations '{"healthCheckPath": "/health"}'`.
- The health check explanation implied all unhealthy App Service instances are removed from rotation. Updated it to match App Service behavior: unhealthy instances are removed up to configured limits, but all unhealthy instances are not removed simultaneously.
- The Azure status API URL returned 404 after redirecting to the current status host. Replaced it with a simple check of the current Azure status page host.
- The Resource Health check queried `properties.resourceHealth` on the web app resource, which is not where Resource Health availability status is exposed. Replaced it with an `az rest` call to the documented `Microsoft.ResourceHealth/availabilityStatuses/current` endpoint.

## Review Notes
Azure Monitor does not expose an App Service metric named specifically for HTTP 503 responses in the supported metrics table; `Http5xx` is the closest platform metric for metric alerts. Exact 503 analysis should use application/web server logs or Application Insights queries.
