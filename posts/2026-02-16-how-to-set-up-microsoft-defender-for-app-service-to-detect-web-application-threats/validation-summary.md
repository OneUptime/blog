# Validation Summary: Set Up Microsoft Defender for App Service to Detect Web Application Threats

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for App Service
- Azure App Service
- Azure CLI
- Microsoft Sentinel
- Azure Monitor action groups
- Azure PowerShell
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Defender for App Service overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-app-service-introduction
- Protect applications with Defender for App Service: https://learn.microsoft.com/en-us/azure/defender-for-cloud/tutorial-enable-app-service-plan
- Azure App Service alerts in Microsoft Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/alerts-azure-app-service
- Azure App Service security recommendations: https://learn.microsoft.com/en-us/azure/defender-for-cloud/recommendations-reference-app-services
- Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact
- Azure CLI `az security alert`: https://learn.microsoft.com/en-us/cli/azure/security/alert
- Azure CLI `az monitor action-group`: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure CLI `az webapp config access-restriction`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/access-restriction
- Microsoft Sentinel data connector CLI reference: https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector
- Microsoft.SecurityInsights dataConnectors ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/2024-03-01/dataconnectors
- Defender for Cloud free trial documentation: https://learn.microsoft.com/en-us/azure/defender-for-cloud/free-trial

## Issues Found
- The prerequisites incorrectly stated that Defender for App Service requires Basic tier or higher and that Free and Shared tiers are unsupported. Microsoft documentation now states an App Service plan on any tier is eligible, with billing across compute instances in all App Service plan tiers. Updated the prerequisite and coverage wording.
- The App Service listing command claimed to show Defender coverage status but only listed web apps and their plan IDs. Updated the comment and query label so the command accurately describes what it returns.
- The `az security contact create` example used invalid current CLI flags (`--alert-notifications on` and `--alerts-to-admins on`). Replaced them with the documented JSON arguments for `--alert-notifications` and `--notifications-by-role`.
- The alert table used specific alert type names that were not aligned with current Microsoft documentation. Replaced it with documented App Service alert categories and typical severities.
- The Microsoft Sentinel connector command used `az sentinel data-connector create --kind`, which is not the documented CLI shape and omitted required connector properties. Replaced it with an `az rest` PUT request using the documented `Microsoft.SecurityInsights/dataConnectors` `AzureSecurityCenter` schema.
- The cost section described pricing as per App Service instance per hour and "a few dollars per App Service per month." Updated it to match Microsoft documentation that billing is based on total compute instances across all App Service plan tiers and depends on current Azure pricing.
- The Azure-specific detection list included management API calls from unexpected locations, which is not a Defender for App Service detection documented in the reviewed sources. Replaced it with documented App Service FTP malicious IP and dangling DNS coverage.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft CLI documentation rather than local `az --help` output.
