# Validation Summary: How to Fix 'NetworkSecurityGroupBlockedTraffic' Issues in Azure NSG Flow Logs

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Azure Network Security Groups
- Azure Network Watcher flow logs
- Azure virtual network flow logs
- Azure Traffic Analytics and Log Analytics
- Azure CLI
- Kusto Query Language
- Azure service tags
- Azure Bastion

## Sources Consulted
- Microsoft Learn: NSG flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Azure CLI `az network watcher flow-log` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log?view=azure-cli-latest
- Microsoft Learn: Traffic analytics schema and data aggregation - https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Microsoft Learn: Traffic analytics overview - https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics
- Microsoft Learn: Azure CLI `az network watcher test-ip-flow` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-test-ip-flow
- Microsoft Learn: IP flow verify overview - https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-ip-flow-verify-overview
- Microsoft Learn: Azure network security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview

## Issues Found
- The post instructed readers to create new NSG flow logs with `az network watcher flow-log create --nsg ...`. Microsoft documents that new NSG flow logs cannot be created after June 30, 2025 and that NSG flow logs retire on September 30, 2027. I updated the setup guidance to use existing NSG flow logs only where already enabled and to create virtual network flow logs for new logging.
- The post described NSG flow log protocol values as TCP, UDP, or Other and listed `O` as a flow tuple protocol value. Microsoft documents NSG flow tuple protocol values as `T` for TCP and `U` for UDP. I removed the unsupported `Other` / `O` references.
- The newer Traffic Analytics KQL example projected `Protocol` and `NSGRule`, which do not match the current `NTANetAnalytics` field names. I changed the query to use `L4Protocol` and `AclRule`.
- The post said the matched rule is formatted as `{NSG-Name}/{RuleName}`. Microsoft documents raw NSG flow logs with a per-flow-group `rule` property and Traffic Analytics fields such as `NSGRule_s` / `NSGList_s` or `AclRule` / `AclGroup`. I corrected the explanation.
- The IP Flow Verify description mentioned only NSG rules. Current Microsoft documentation says IP Flow Verify evaluates NSG rules and Azure Virtual Network Manager admin rules. I updated the wording accordingly.

## Review Notes
The Azure CLI was not installed in the workspace, so CLI examples were verified against Microsoft Learn CLI reference pages rather than local `az --help` output.
