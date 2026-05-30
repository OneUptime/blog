# Validation Summary: How to Troubleshoot Azure VNet Peering Connectivity Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Virtual Network peering
- Azure CLI
- Azure Network Watcher
- Network Security Groups
- User-defined routes and effective routes
- Azure Private DNS and Azure-provided DNS
- Azure service endpoints
- VPN and ExpressRoute gateway transit

## Sources Consulted
- Azure CLI reference for `az network vnet peering`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering?view=azure-cli-latest
- Azure CLI reference for `az network nic`: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Azure CLI reference for `az network watcher`: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Azure Virtual Network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Create, change, or delete Azure Virtual Network peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Troubleshoot virtual network peering issues: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-peering-issues
- Troubleshoot virtual network peering route propagation and sync problems: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-peering-sync-route-issues
- Azure virtual network traffic routing: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Azure Network Watcher next hop overview: https://learn.microsoft.com/en-us/azure/network-watcher/next-hop-overview
- DNS name resolution options for Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/azure-dns
- Azure virtual network service endpoints: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview

## Issues Found
- The forwarded traffic explanation described a VM sending traffic to VNet B that was destined for a third network. That was imprecise because `allowForwardedTraffic` controls whether forwarded traffic from the remote virtual network is allowed over the peering into the local virtual network. Updated the paragraph to describe forwarded traffic from an NVA or gateway in VNet A entering VNet B, and to specify that the setting is enabled on VNet B's peering to VNet A.

## Review Notes
- The Azure CLI examples use current GA commands and valid parameters according to the latest official Azure CLI documentation. The local environment did not have `az` installed, so command syntax was verified against Microsoft Learn rather than local `--help` output.
- Network Watcher tools require Network Watcher to be available for the VM region, as documented by Microsoft. The post's commands are still valid.
