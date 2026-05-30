# Validation Summary: How to Set Up Network Security Group Flow Logs and Analyze Them

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Network Watcher
- Network Security Group flow logs
- Traffic Analytics
- Azure Storage
- Log Analytics workspace
- Azure PowerShell
- Kusto Query Language (KQL)
- Azure Monitor scheduled query alerts

## Sources Consulted
- Microsoft Learn: NSG flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Create, change, enable, disable, or delete NSG flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- Microsoft Learn: Migrate from network security group flow logs to virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate
- Microsoft Learn: Traffic analytics overview - https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics
- Microsoft Learn: Traffic analytics schema and data aggregation - https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Microsoft Learn: Set-AzNetworkWatcherFlowLog PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.network/set-aznetworkwatcherflowlog
- Microsoft Learn: New-AzScheduledQueryRuleConditionObject PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.monitor/new-azscheduledqueryruleconditionobject

## Issues Found
- The post is a 2026 from-scratch setup guide for NSG flow logs, but Microsoft states that NSG flow logs are being retired on September 30, 2027, and that new NSG flow logs cannot be created after June 30, 2025. Because the article's core workflow creates new NSG flow logs, the main premise is no longer technically valid.
- Microsoft recommends migrating to virtual network flow logs instead. Correcting this tutorial would require rewriting it around virtual network flow logs, including different setup guidance and the `NTANetAnalytics` Traffic Analytics table, rather than making narrow technical fixes to the existing NSG flow log article.
- The post uses `AzureNetworkAnalytics_CL`, which is correct for Traffic Analytics data from NSG flow logs, but Microsoft documents `NTANetAnalytics` as the replacement table for virtual network flow logs. This reinforces that the article is tied to the retired NSG flow log path.

## Review Notes
The post was not edited because the required correction would be a substantial rewrite into a different tutorial. Existing NSG flow log records and existing configured resources may still exist until retirement, but this article teaches creating new NSG flow logs after the documented creation cutoff date.
