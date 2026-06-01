# Validation Summary: How to Create and Associate a Route Table with an Azure Subnet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Network
- Azure route tables
- User-defined routes (UDRs)
- Azure CLI
- Azure Network Watcher effective routes
- Network virtual appliances and IP forwarding
- Hub-spoke networking

## Sources Consulted
- Microsoft Learn: Azure virtual network traffic routing - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: Create, change, or delete an Azure route table - https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table
- Microsoft Learn: Azure CLI `az network route-table` reference - https://learn.microsoft.com/en-us/cli/azure/network/route-table?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network route-table route` reference - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet subnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Tutorial: Route network traffic with a route table - https://learn.microsoft.com/en-us/azure/virtual-network/tutorial-create-route-table

## Issues Found
- The route evaluation explanation and diagram implied that Azure checks for any UDR match before considering BGP or system routes. Azure selects routes by longest-prefix match first, then uses route source priority only when multiple routes have the same prefix. Updated the text and diagram to reflect this.
- The BGP propagation explanation said setting `--disable-bgp-route-propagation true` makes UDRs the only routes. This is not correct because system routes still exist. Updated the wording to say it prevents gateway routes from being propagated to associated subnets.
- The next-hop type table described `VirtualNetworkGateway` as routing through a VPN or ExpressRoute gateway. Current Azure documentation states UDRs with next hop type `VirtualNetworkGateway` are supported only when the virtual network's gateway is a VPN gateway. Updated the description to VPN gateway.
- The hub-spoke forced tunneling description did not mention forwarded-traffic requirements for a firewall in a peered hub VNet. Added a short note to configure VNet peering to allow forwarded traffic.

## Review Notes
The Azure CLI commands and flags used in the post match current Microsoft Learn CLI reference pages. The local environment did not have the Azure CLI installed, so command verification was performed against official Microsoft Learn documentation rather than local `az --help` output.
