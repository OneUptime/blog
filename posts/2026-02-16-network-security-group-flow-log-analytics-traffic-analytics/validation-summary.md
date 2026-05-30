# Validation Summary: How to Create Network Security Group Flow Log Analytics with Traffic Analytics

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Network Watcher
- Network Security Group flow logs
- Traffic Analytics
- Azure Storage accounts
- Log Analytics workspaces
- Azure CLI
- Kusto Query Language
- Azure Monitor scheduled query alerts

## Sources Consulted
- Microsoft Learn, Flow logging for network security groups: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn, Create, change, enable, disable, or delete NSG flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- Microsoft Learn, Migrate from network security group flow logs to virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate
- Microsoft Learn, Azure CLI `az network watcher flow-log`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log
- Microsoft Learn, Traffic analytics schema and data aggregation: https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Microsoft Learn, Azure CLI `az monitor scheduled-query`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure pricing, Network Watcher pricing: https://azure.microsoft.com/en-us/pricing/details/network-watcher/

## Issues Found
- The post's primary workflow is to create new Network Security Group flow logs with Traffic Analytics. Microsoft documents that NSG flow logs are retired on September 30, 2027, and that new NSG flow logs cannot be created after June 30, 2025. Because the post is dated February 16, 2026, the central `az network watcher flow-log create --nsg ...` workflow is no longer valid for new deployments.
- Microsoft recommends migrating to Virtual Network flow logs instead of creating NSG flow logs. Correcting the post would require changing the core resource type, command examples, Traffic Analytics table names, and KQL schema, which would be a rewrite rather than a targeted technical correction.
- The Azure CLI scheduled query alert example is also incomplete for the current CLI syntax because the documented pattern uses a query placeholder in `--condition` with the actual KQL supplied through `--condition-query`.

## Review Notes
The post contains useful background on Traffic Analytics concepts and some KQL fields are consistent with the legacy `AzureNetworkAnalytics_CL` NSG flow log schema. However, the tutorial should be removed or replaced with a new guide for Virtual Network flow logs and the `NTANetAnalytics` Traffic Analytics schema.
