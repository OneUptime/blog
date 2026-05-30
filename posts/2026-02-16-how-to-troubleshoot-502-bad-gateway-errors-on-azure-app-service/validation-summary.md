# Validation Summary: How to Troubleshoot 502 Bad Gateway Errors on Azure App Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure App Service on Linux
- Azure App Service custom containers
- Azure CLI
- Azure Monitor metrics
- Application Insights / KQL
- IIS / Windows App Service diagnostics

## Sources Consulted
- Microsoft Learn: Troubleshoot HTTP 502 and 503 errors in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-http-502-http-503
- Microsoft Learn: Web request times out in App Service - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/web-request-times-out-app-service
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Configure a custom container for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- Microsoft Learn: Azure App Service on Linux FAQ - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux
- Microsoft Learn: Azure CLI az webapp log reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log
- Microsoft Learn: Manage an App Service plan - https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage
- Microsoft Learn: Supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Microsoft Learn: Supported metrics for Microsoft.Web/serverfarms - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- Microsoft Learn: Enable diagnostic logging for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs
- Microsoft Learn: Monitor App Service instances by using Health check - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: Dependency tracking in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/dependencies

## Issues Found
- The post stated a blanket 230-second App Service request timeout. Microsoft documents approximately 230 seconds for Windows apps and 240 seconds for Linux apps, so the timeout language was corrected to distinguish those platforms.
- The post said Linux/container apps should listen on port 8080 by default. Microsoft documents that built-in Linux containers should use the `PORT` environment variable, while custom containers can be auto-detected on ports 80 and 8080 or configured with `WEBSITES_PORT` for other ports. The port guidance was updated accordingly.
- The container startup section implied that exceeding the startup time limit directly results in a 502. Microsoft documents this as a failed startup attempt with retries, commonly resulting in service unavailable or gateway-style failures. The wording was adjusted to avoid an overly specific status-code claim.
- The Azure Monitor metrics example queried `CpuPercentage,MemoryPercentage` against the web app resource (`Microsoft.Web/sites`). `MemoryPercentage` is an App Service plan metric under `Microsoft.Web/serverfarms`, so the command was corrected to query the App Service plan resource.

## Review Notes
The Azure CLI commands for log streaming, log download, Docker container logging, app settings, and App Service plan scaling match current Azure CLI documentation. The KQL query is syntactically valid for Application Insights request telemetry. `az webapp log download` is documented as possibly not working with Linux apps, but the command itself is current.
