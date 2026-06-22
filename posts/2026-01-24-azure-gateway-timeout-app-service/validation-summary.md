# Validation Summary: How to Fix 'Gateway Timeout' App Service Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure Load Balancer
- Azure CLI
- Azure Monitor and Application Insights
- Kusto Query Language (KQL)
- ASP.NET Core / C#
- Node.js
- Python requests
- Azure SQL
- Azure Cache for Redis

## Sources Consulted
- Microsoft Learn: Web request times out in App Service - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/web-request-times-out-app-service
- Microsoft Learn: Monitor the health of App Service instances - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Monitor Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service
- Microsoft Learn: Connection strings in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings
- Microsoft Learn: Azure CLI az webapp reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Azure CLI az monitor app-insights component reference - https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Azure CLI az monitor metrics alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics

## Issues Found
- The post described the App Service request timeout as a universal fixed 230 seconds. Microsoft documents approximately 230 seconds for Windows apps and 240 seconds for Linux apps, so the wording was updated to distinguish the platform-specific values.
- The Application Insights setup used `APPINSIGHTS_INSTRUMENTATIONKEY`. Current App Service and Application Insights documentation recommends `APPLICATIONINSIGHTS_CONNECTION_STRING`, so the app setting was updated.
- The startup and health-check CLI snippet used unsupported `az webapp config set` flags: `--startup-time-limit` and `--health-check-path`. These were replaced with `WEBSITES_CONTAINER_START_TIME_LIMIT` via `az webapp config appsettings set` and `healthCheckPath` via `--generic-configurations`.
- The startup-health explanation conflated Linux/container startup readiness with Health Check routing behavior. The wording was corrected to describe startup retries separately from Health Check removing unhealthy instances from load balancer rotation.
- The background job C# example referenced an undefined `data` variable. The action signature now accepts `[FromBody] object data`.
- The metric alert command used `--action-group`, which is not the documented parameter for `az monitor metrics alert create`. It was changed to `--action`.
- The closing sentence referred to a universal "230 second limit." It was updated to refer to the App Service request timeout generally.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command reference pages rather than local `az --help` output.
