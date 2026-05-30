# Validation Summary: How to Set Up Azure Monitor Diagnostic Settings to Stream Logs to a Log

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Monitor diagnostic settings
- Azure Log Analytics workspaces
- Azure CLI
- ARM templates
- Azure Policy
- KQL

## Sources Consulted
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/create-diagnostic-settings
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: `Microsoft.Insights/diagnosticSettings` ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings
- Microsoft Learn: Metrics in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/data-platform-metrics
- Microsoft Learn: Supported logs for `Microsoft.KeyVault/vaults` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-keyvault-vaults-logs
- Microsoft Learn: Key Vault monitoring data reference - https://learn.microsoft.com/en-us/azure/key-vault/general/monitor-key-vault-reference
- Microsoft Learn: Supported logs for `Microsoft.Web/sites` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Microsoft Learn: Azure Policy assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Built-in policy definitions for Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/policy-reference
- Microsoft Learn: Create diagnostic settings at scale by using built-in Azure policies - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostics-settings-policies-deployifnotexists
- Microsoft Learn: Usage table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/usage

## Issues Found
- The Azure CLI diagnostic settings example mixed an individual log category (`AuditEvent`) with the `allLogs` category group. Microsoft documents that category groups and individual categories should not be selected together in one diagnostic setting, so the example now uses only `allLogs`.
- The CLI example discussed resource-specific tables but did not enable resource-specific export. Added `--export-to-resource-specific true`.
- The ARM template snippet did not set resource-specific Log Analytics mode. Added `"logAnalyticsDestinationType": "Dedicated"` and clarified that diagnostic settings are extension resources scoped to the monitored resource.
- The latency guidance was too narrow at 2 to 15 minutes / 5 to 10 minutes. Updated it to say logs often arrive sooner, but Azure Monitor documents that data should start flowing within 90 minutes.
- The Azure Policy assignment command used the outdated/undocumented `--assign-identity` flag. Replaced it with `--mi-system-assigned` and added the required role assignments for remediation.
- The resource-specific versus `AzureDiagnostics` explanation implied this was only an old-resource versus new-resource split. Reworded it to describe default collection mode versus resource-specific mode for supported resources.

## Review Notes
The post is technically relevant and suitable as a tutorial. Some examples still use placeholder resource names and subscription IDs, which is appropriate for a guide. The KQL examples are valid, and the `Usage` query correctly treats `Quantity` as megabytes before converting to GB.
