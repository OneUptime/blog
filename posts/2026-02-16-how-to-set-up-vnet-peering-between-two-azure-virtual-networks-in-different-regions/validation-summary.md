# Validation Summary: How to Set Up VNet Peering Between Two Azure Virtual Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network
- Azure VNet peering
- Global VNet peering
- Azure CLI
- Azure Portal
- Azure Network Watcher
- Azure Connection Monitor
- Virtual network flow logs

## Sources Consulted
- Microsoft Learn: Virtual network peering overview - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete a virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Azure CLI `az network vnet create` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn: Azure CLI `az network vnet peering create` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering
- Microsoft Learn: Azure Network Watcher NSG flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview
- Microsoft Learn: Azure Network Watcher virtual network flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-overview
- Microsoft Learn: Connection Monitor overview - https://learn.microsoft.com/en-us/azure/network-watcher/connection-monitor-overview

## Issues Found
- The monitoring section recommended enabling NSG flow logs. Microsoft has retired creation of new NSG flow logs after June 30, 2025 and recommends virtual network flow logs instead. Changed the recommendation to "virtual network flow logs" while keeping the rest of the monitoring guidance intact.

## Review Notes
The Azure CLI commands and flags in the post match the current Azure CLI documentation. The explanations of non-overlapping address spaces, two-sided peering links, peering state, non-transitive peering, NSG enforcement, gateway transit options, portal behavior, and Microsoft backbone routing are consistent with Microsoft Learn documentation.
