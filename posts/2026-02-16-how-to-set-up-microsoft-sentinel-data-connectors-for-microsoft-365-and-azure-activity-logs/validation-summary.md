# Validation Summary: How to Set Up Microsoft Sentinel Data Connectors for Microsoft 365

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Sentinel
- Azure Monitor Log Analytics
- Microsoft 365 / Office 365 audit logs
- Azure Activity logs
- Azure PowerShell
- Azure CLI
- Microsoft SecurityInsights REST API
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Sentinel onboarding cmdlet: https://learn.microsoft.com/en-us/powershell/module/az.securityinsights/new-azsentinelonboardingstate
- Microsoft Sentinel data connector REST API: https://learn.microsoft.com/en-us/rest/api/securityinsights/data-connectors/create-or-update
- Microsoft SecurityInsights dataConnectors ARM schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/2023-02-01/dataconnectors
- Microsoft Sentinel Azure Activity connector reference: https://learn.microsoft.com/en-us/azure/sentinel/data-connectors-reference#azure-activity
- Microsoft Sentinel tables and connectors reference: https://learn.microsoft.com/en-us/azure/sentinel/sentinel-tables-connectors-reference
- Azure CLI subscription diagnostic settings command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings/subscription
- OfficeActivity table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/officeactivity
- AzureActivity table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azureactivity
- Microsoft Sentinel billing and free data sources: https://learn.microsoft.com/en-us/azure/sentinel/billing
- Log Analytics retention behavior for AzureActivity: https://learn.microsoft.com/en-us/azure/sentinel/configure-data-retention

## Issues Found
- The workspace creation example enabled Sentinel with `New-AzMonitorLogAnalyticsSolution -Type SecurityInsights`. Replaced it with `New-AzSentinelOnboardingState`, which is the current Az.SecurityInsights cmdlet for creating the Sentinel onboarding state on a workspace.
- The Microsoft 365 PowerShell section described the connector as an "Office ATP connector type". Changed this to the `Office365` connector kind used by the SecurityInsights data connector API.
- The Microsoft 365 REST payload used lowercase `enabled` values. Changed these to `Enabled`, matching the documented `DataTypeState` enum values.
- The Azure Activity deletion detection query checked `ActivityStatusValue == "Success"`. Changed this to `Succeeded`, which matches the documented AzureActivity status values.
- The cost guidance said Microsoft 365 logs are free for the first 90 days in the basic logs tier. Reworded this because OfficeActivity is not a Basic Log table, and Office 365 audit logs are listed as free Microsoft Sentinel data sources.
- The cost guidance implied data collection rules generally apply to these sources. Reworded it to "Where supported" because AzureActivity currently does not support DCR-based transformations, while OfficeActivity does.

## Review Notes
The local environment did not have `az` or PowerShell installed, so CLI and PowerShell syntax were checked against official Microsoft documentation rather than local command output. Microsoft notes that Microsoft Sentinel in the Azure portal is being redirected to the Defender portal for customers in 2025-2026; the Azure portal steps are still documented but may need future screenshots or navigation updates.
