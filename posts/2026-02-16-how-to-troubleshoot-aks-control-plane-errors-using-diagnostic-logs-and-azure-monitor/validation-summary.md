# Validation Summary: How to Troubleshoot AKS Control Plane Errors Using Diagnostic Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Monitor diagnostic settings
- Azure Monitor Logs / Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Kubernetes control plane logs

## Sources Consulted
- Microsoft Learn: Monitor Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/monitor-aks
- Microsoft Learn: Monitoring data reference for Azure Kubernetes Service: https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Microsoft Learn: Azure Monitor Logs reference - AKSControlPlane: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/akscontrolplane
- Microsoft Learn: Azure Monitor Logs reference - AzureDiagnostics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azurediagnostics
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure CLI `az monitor log-analytics`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: Azure CLI `az monitor scheduled-query`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- GitHub profile link check: https://github.com/nawazdhandala

## Issues Found
- The post used the Log Analytics workspace ARM resource ID as the `az monitor log-analytics query --workspace` value. Azure CLI documentation specifies that `--workspace` for queries is the workspace GUID, while diagnostic settings and alert scopes use ARM resource IDs. I changed the setup to capture both `WORKSPACE_RESOURCE_ID` and `WORKSPACE_CUSTOMER_ID`, then used each in the correct place.
- The API server 5xx and 429 KQL examples searched for generic text fragments that match older or less reliable log formats. I updated them to match current Kubernetes API server log fields such as `resp=5...` / `resp=429` and audit-style JSON response codes.
- The slow API request query looked for `Duration: ...`, which does not match the common Kubernetes API server log field format. I updated it to parse `latency="..."` values and convert seconds or milliseconds to `durationMs` before comparing with the five-second threshold.
- The `az monitor scheduled-query create` examples used invalid current Azure CLI syntax: a bare `count > N` condition, raw query text in `--condition-query`, and numeric minute values for `--window-size` / `--evaluation-frequency`. I updated the examples to use named query placeholders and duration values such as `5m` and `10m`.

## Review Notes
The post intentionally uses Azure diagnostics mode and queries the `AzureDiagnostics` table. Microsoft recommends resource-specific mode for easier querying and Basic Logs support, but the AzureDiagnostics approach remains documented and valid when the diagnostic setting is created without resource-specific export.
