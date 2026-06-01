# Validation Summary: How to Deploy Azure Static Web Apps with Custom Domains Using Bicep Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Static Web Apps
- Azure Bicep
- Azure Resource Manager resource types
- Static Web Apps custom domains and DNS validation
- Azure Functions linked backends
- Static Web Apps application settings
- staticwebapp.config.json
- Azure Monitor diagnostic settings
- Azure CLI deployment commands

## Sources Consulted
- Microsoft.Web/staticSites 2022-09-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-09-01/staticsites
- Microsoft.Web/staticSites/customDomains 2022-09-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-09-01/staticsites/customdomains
- Static Sites custom domain REST API reference: https://learn.microsoft.com/en-us/rest/api/appservice/static-sites/create-or-update-static-site-custom-domain
- Custom domains with Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain
- Azure Static Web Apps hosting plans: https://learn.microsoft.com/en-us/azure/static-web-apps/plans
- Microsoft.Web/staticSites/config appsettings Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2021-02-01/staticsites/config-appsettings
- Microsoft.Web/staticSites/linkedBackends 2022-09-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-09-01/staticsites/linkedbackends
- Configure Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Microsoft.Insights/diagnosticSettings Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings
- Supported logs for Microsoft.Web/staticsites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-staticsites-logs

## Issues Found
- The Static Web App `buildProperties` example used `skipApiDetection`, which is not part of the `Microsoft.Web/staticSites@2022-09-01` resource schema. Removed the unsupported property.
- The post stated that the Standard SKU is required for custom domains with SSL and managed Functions APIs. Microsoft's plan documentation shows those features exist on the Free tier, with lower limits. Updated the SKU explanation to identify Standard-only production features such as bring-your-own Functions, private endpoints, SLA, higher limits, and custom provider registrations.
- The custom-domain DNS instructions implied that the TXT validation token is available before deploying the custom domain resource. For `dns-txt-token` validation, Azure returns the token from the custom domain resource, then DNS is updated and validation completes asynchronously. Updated the apex-domain flow.
- The apex-domain DNS guidance mentioned an A record as a normal option. Microsoft recommends ALIAS, ANAME, or CNAME flattening for apex domains; A records route to a single regional host and are not recommended. Updated the guidance.
- The linked-backend section did not mention that bring-your-own Functions backends require the Standard SKU. Added that caveat.
- The diagnostic settings snippet referenced undefined `staticWebApp` and `logAnalyticsWorkspaceId` symbols and used the unsupported `StaticSiteErrors` log category. Added the missing parameter/resource declarations and replaced the log category with supported `StaticSiteDiagnosticLogs` and `StaticSiteHttpLogs` categories.

## Review Notes
The Azure CLI and Bicep CLI were not installed in the local workspace, so snippets were not compiled locally. The Bicep resource shapes were checked against Microsoft Learn ARM/Bicep schema references, and the Azure CLI deployment command syntax was reviewed against the documented `az deployment group create` pattern.
