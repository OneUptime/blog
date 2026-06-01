# Validation Summary: How to Fix '503 Service Unavailable' Errors in Azure App Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure App Service Plans
- Azure CLI
- Azure Monitor metrics and autoscale
- Azure App Service Health Check
- Azure Resource Health
- ASP.NET Core on Azure App Service
- Linux and custom container port configuration
- Deployment slots

## Sources Consulted
- Microsoft Learn: Troubleshoot HTTP 502 and HTTP 503 errors in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-http-502-http-503
- Microsoft Learn: "Error 403 - This web app is stopped" message - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/error-403-web-app-stopped-message
- Microsoft Learn: Monitor App Service instances by using Health check - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: What are Azure App Service plans? - https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Microsoft Azure: App Service pricing details - https://azure.microsoft.com/en-us/pricing/details/app-service/windows/
- Microsoft Learn: az webapp log CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log
- Microsoft Learn: az webapp CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: az monitor metrics CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: az monitor autoscale CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale
- Microsoft Learn: az resource CLI reference - https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Azure App Service on Linux FAQ - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux
- Microsoft Learn: Configure Node.js apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Troubleshoot ASP.NET Core on Azure App Service and IIS - https://learn.microsoft.com/en-us/aspnet/core/test/troubleshoot-azure-iis

## Issues Found
- The post said a stopped App Service returns 503 for every request. Microsoft documents the stopped/quota case as "Error 403 - This web app is stopped," so the wording was changed to treat this as a related state check rather than a 503-specific symptom.
- The root-cause list included a stopped app as a frequent 503 cause. This was narrowed to running apps whose worker process or container is failed, because a manually stopped app normally produces the Azure 403 stopped page.
- The port binding guidance implied that `PORT` and `WEBSITES_PORT` apply interchangeably. It was corrected to distinguish built-in Linux/Node.js `PORT` behavior from custom Linux container `WEBSITES_PORT` forwarding.
- The health check section said all failed instances are removed and all traffic fails with 503. Microsoft documents that App Service limits unhealthy instance exclusion by default and excludes none when all instances are unhealthy unless `WEBSITE_HEALTHCHECK_MAXUNHEALTHYWORKERPERCENT` is changed. The section was corrected.
- The health check status guidance said the endpoint must return exactly 200. Microsoft documents healthy responses as HTTP 200-299 within one minute, so the wording was corrected.
- The prevention tip said health checks should not depend on external services. Microsoft guidance is more nuanced: the endpoint should reflect components required for readiness. The tip was revised to recommend checking only dependencies that must work before receiving traffic.

## Review Notes
The Azure CLI examples and ASP.NET Core stdout logging snippet matched current documented command shapes and configuration fields. The Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.
