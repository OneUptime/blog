# Validation Summary: How to Fix VNet Peering Connectivity Issues Between Azure Virtual Networks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Virtual Network peering
- Azure CLI
- Azure Network Watcher
- Azure network security groups
- Azure user-defined routes
- Azure Private DNS
- Azure Virtual WAN
- Azure VPN Gateway
- Azure Load Balancer

## Sources Consulted
- Microsoft Learn: Azure virtual network peering overview - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Troubleshoot virtual network peering issues - https://learn.microsoft.com/en-ie/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-peering-issues
- Microsoft Learn: Troubleshoot virtual network peering route propagation and sync problems - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-peering-sync-route-issues
- Microsoft Learn: Azure CLI az network vnet peering - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering
- Microsoft Learn: Azure CLI az network watcher test-ip-flow - https://learn.microsoft.com/en-us/cli/azure/network/watcher
- Microsoft Learn: Diagnose a VM traffic filter problem using Azure CLI - https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem-cli
- Microsoft Learn: Azure CLI az network route-table route - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route
- Microsoft Learn: Azure CLI az network nic update - https://learn.microsoft.com/en-us/cli/azure/network/nic
- Microsoft Learn: Configure DNS name resolution for Azure virtual networks - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances

## Issues Found
- The post said a Disconnected peering is usually caused by deletion or address space changes and should be fixed by deleting and recreating both links. I changed this to distinguish deleted peerings from address-space changes where the peering may stay Connected but require a peering sync.
- The route table section used incorrect next hop labels, including "VNetGlobalPeering." I changed the wording to the documented "Virtual network peering" / "VirtualNetworkPeering" terminology.
- The route table section included an incorrect UDR example using `--next-hop-type VirtualNetworkGateway` to send traffic directly to a peered VNet. I removed the command and clarified that Azure creates peering system routes automatically and that virtual network peering cannot be specified as a UDR next hop.
- The global peering section incorrectly linked remote gateways to Basic SKU load balancers. I changed it to the documented limitation: resources in one globally peered VNet cannot communicate with the front-end IP address of a Basic SKU load balancer in the other VNet.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output. The remaining commands and concepts match current official documentation.
