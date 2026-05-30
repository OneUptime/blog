# Validation Summary: How to Troubleshoot Azure Virtual Desktop Connection Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Virtual Desktop
- Azure Monitor diagnostic settings
- Log Analytics workspaces
- Kusto Query Language (KQL)
- Azure CLI
- Azure RBAC
- FSLogix profile containers

## Sources Consulted
- Microsoft Learn: Send diagnostic data to Log Analytics for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/diagnostics-log-analytics
- Microsoft Learn: Supported logs for Microsoft.DesktopVirtualization/hostpools - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-desktopvirtualization-hostpools-logs
- Microsoft Learn: Azure Monitor Logs reference - WVDConnections - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/wvdconnections
- Microsoft Learn: Azure Monitor Logs reference - WVDAgentHealthStatus - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/wvdagenthealthstatus
- Microsoft Learn: Azure Monitor Logs reference - WVDConnectionNetworkData - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/wvdconnectionnetworkdata
- Microsoft Learn: Azure Monitor Logs reference - WVDConnectionGraphicsDataPreview - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/wvdconnectiongraphicsdatapreview
- Microsoft Learn: Example log table queries for WVDConnections - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/wvdconnections
- Microsoft Learn: Example log table queries for WVDConnectionNetworkData - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/wvdconnectionnetworkdata
- Microsoft Learn: Example log table queries for WVDAgentHealthStatus - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/wvdagenthealthstatus
- Microsoft Learn: Analyze connection quality in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/connection-latency
- Microsoft Learn: az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: az monitor log-analytics workspace - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: Deploy Azure Virtual Desktop - https://learn.microsoft.com/azure/virtual-desktop/deploy-azure-virtual-desktop
- Microsoft Learn: Troubleshoot Azure Virtual Desktop Insights - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-desktop/troubleshoot-insights

## Issues Found
- The diagnostics CLI comment claimed the example enabled all AVD log categories, but the current supported host pool categories include additional categories such as autoscale, session host management, and multilink logs. Changed the comment to say it enables the categories used in the guide.
- The graphics diagnostics table was listed as `WVDConnectionGraphicsData`, but the current Azure Monitor table is `WVDConnectionGraphicsDataPreview`. Updated the table name.
- The failed connection query filtered `WVDConnections` with states such as `Failed` and `Broken`. Current Microsoft examples describe connection activity states as `Started`, `Connected`, and `Completed`, with failures investigated through `WVDErrors`. Reworked the query to start from `WVDErrors` and join connection details by `CorrelationId`.
- The slow connection query used checkpoint names that are not part of the current official sample query. Reworked it to use the documented `Started` to `Connected` timing pattern and the `LoadBalancedNewConnection` checkpoint.
- The session host health query used `HealthStatus`, which is not a current column in `WVDAgentHealthStatus`. Changed it to `Status` and projected `AgentVersion` directly.
- The alert query counted `State == "Failed"` from `WVDConnections`. Changed it to calculate error rate from distinct `WVDErrors` correlation IDs over distinct started connection attempts, with a guard for zero connection attempts.
- The post stated diagnostics data appears in 15 to 30 minutes. Microsoft documentation notes Azure Monitor log latency can be 15 minutes and first diagnostics setup can take a few hours, so the wording was corrected.

## Review Notes
The Azure CLI binary was not installed in the local environment, so CLI syntax was validated against Microsoft Learn CLI reference rather than local `az --help` output. The post's data-volume estimate is environment-dependent and should be treated as a rough planning example rather than a guaranteed sizing rule.
