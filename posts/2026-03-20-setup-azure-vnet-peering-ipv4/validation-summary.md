# Validation Summary: How to Set Up Azure VNet Peering for IPv4 Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network
- Azure VNet Peering
- Global VNet Peering
- Azure CLI
- IPv4 networking
- VPN Gateway and ExpressRoute gateway transit

## Sources Consulted
- Microsoft Learn: Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Azure CLI `az network vnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet peering` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm run-command` reference - https://learn.microsoft.com/en-us/cli/azure/vm/run-command?view=azure-cli-latest
- Microsoft Learn: Azure Virtual Network cost optimization principles - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-cost-optimization

## Issues Found
- The cross-region global peering example only created the east-to-west peering. Azure CLI documentation states that successful peering requires running `az network vnet peering create` twice with `--vnet-name` and `--remote-vnet` reversed. Added the east VNet ID lookup and the west-to-east peering command.
- The global peering pricing note could imply that only global peering has bandwidth charges. Updated it to say global peering uses zone-based bandwidth charges and typically has higher latency than same-region peering.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against the official Microsoft Learn Azure CLI reference. The gateway transit commands use documented generic update properties. The post assumes the resource group, test VMs, required subnets, and the `vnet-west` VNet exist where referenced.
