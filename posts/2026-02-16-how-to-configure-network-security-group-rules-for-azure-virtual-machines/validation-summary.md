# Validation Summary: How to Configure Network Security Group Rules for Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Network Security Groups
- Azure Virtual Machines
- Azure Virtual Network subnets and network interfaces
- Azure CLI
- Azure service tags
- Azure Network Watcher flow logs

## Sources Consulted
- Microsoft Learn: Azure network security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn: How Network Security Groups filter network traffic in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Microsoft Learn: Azure CLI `az network nsg` reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nsg rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet subnet update` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic update` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Migrate from network security group flow logs to virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate

## Issues Found
- The Azure SQL service tag example described allowing traffic from Azure SQL inbound to a backend subnet. Microsoft documents the `Sql` service tag as the Azure SQL Database/Azure Synapse public endpoint tag and recommends it for outbound rules. I changed the example to allow outbound TCP 1433 traffic to the `Sql` destination service tag.
- The best practices section recommended enabling NSG flow logs. Microsoft states that NSG flow logs are being retired on September 30, 2027 and that new NSG flow logs cannot be created after June 30, 2025. I changed the recommendation to use virtual network flow logs for new deployments.

## Review Notes
The Azure CLI command shapes, NSG rule priority range, default rule behavior, subnet/NIC association commands, rule evaluation order, and augmented rule examples matched current Microsoft documentation. The local environment did not have the Azure CLI installed, so command validation was performed against the official Microsoft Learn CLI reference.
