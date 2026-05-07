# Validation Summary: How to Create Azure Virtual Network Peering with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Network (VNet) Peering
- AzureRM provider
- Azure CLI
- HCL

## Sources Consulted
- Microsoft Learn: Azure Virtual Network peering overview - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Update the address space for a peered virtual network - https://learn.microsoft.com/en-us/azure/virtual-network/update-virtual-network-peering-address-space
- Microsoft Learn: `az network vnet peering` - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering?view=azure-cli-latest
- Terraform Registry: `azurerm_virtual_network_peering` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- Terraform Registry: AzureRM features block guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- HashiCorp AzureRM provider repository usage example - https://github.com/hashicorp/terraform-provider-azurerm

## Issues Found
- The cross-region `azurerm` provider blocks omitted `features {}`. I added an empty `features` block to both aliased provider configurations so the example matches current AzureRM provider usage.
- The conclusion incorrectly stated that changing the address space of a peered VNet requires disconnecting and reconnecting the peering. I corrected this to reflect current Azure behavior: resizing is supported, and the peering must be synced so the remote VNet picks up the updated prefixes.
- The connectivity test used `ping` without noting that ICMP can be blocked independently of peering. I added a note that NSGs and guest firewalls must allow ICMP for that check to work.

## Review Notes
- Azure documentation currently states that gateway transit can be used with both local and global VNet peerings. The current AzureRM provider documentation for `azurerm_virtual_network_peering` still includes a note that `use_remote_gateways` must be `false` for global VNet peerings. This post's global peering example does not enable remote gateways, so the example remains valid as written.
- The local workspace does not have `tofu` or `az` installed, so command verification was done against official documentation rather than local CLI `--help` output.
