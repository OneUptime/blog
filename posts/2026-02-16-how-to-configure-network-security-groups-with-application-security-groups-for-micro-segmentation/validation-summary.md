# Validation Summary: How to Configure Network Security Groups with App Security Groups for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network
- Azure Network Security Groups
- Azure Application Security Groups
- Azure Network Watcher
- Azure virtual network flow logs
- Azure CLI
- Virtual Machine Scale Sets

## Sources Consulted
- Microsoft Learn: Tutorial: Filter network traffic with a network security group - https://learn.microsoft.com/en-us/azure/virtual-network/tutorial-filter-network-traffic
- Microsoft Learn: Azure Application Security Groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups
- Microsoft Learn: How network security groups filter network traffic - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: Azure CLI reference for az network watcher test-ip-flow - https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-test-ip-flow
- Microsoft Learn: Manage virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Microsoft Learn: Manage NSG flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- Microsoft Learn: Migrate from network security group flow logs to virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate
- Microsoft Learn: Traffic analytics overview - https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics
- Microsoft Learn: Azure CLI reference for az vmss create - https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-latest#az-vmss-create

## Issues Found
- The management SSH rule referenced the ManagementHosts ASG, but the setup never assigned a management NIC to that ASG. Added a management host NIC assignment example so the rule can match traffic.
- The Network Watcher IP flow verify example used the app server IP as the local endpoint but targeted web-vm1. For inbound checks, the local endpoint is on the target VM, so the command now targets app-vm1.
- The post recommended creating new NSG flow logs. Microsoft documentation states new NSG flow logs can no longer be created after June 30, 2025 and recommends virtual network flow logs. Updated the section and Azure CLI command to create a virtual network flow log instead.
- The Traffic Analytics description said dashboards show traffic patterns between ASGs. Updated it to describe virtual network traffic patterns, which matches the current Traffic Analytics documentation.
- The VMSS example used --application-security-groups, which is not the current az vmss create option. Replaced it with --asgs, the Azure CLI option for associating existing application security groups with VMSS instances.
- Added the same-virtual-network ASG constraint because Microsoft documents that ASGs referenced together in an NSG rule must contain network interfaces from the same virtual network.

## Review Notes
The local environment did not have Azure CLI installed, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local --help output.
