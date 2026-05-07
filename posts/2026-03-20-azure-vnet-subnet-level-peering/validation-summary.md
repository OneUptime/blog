# Validation Summary: How to Configure Subnet-Level Peering in Azure VNet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Network
- Azure subnet peering / virtual network peering
- Azure CLI
- Azure Network Security Groups (NSGs)
- Terraform (`azurerm`)

## Sources Consulted
- Microsoft Learn, Azure subnet peering: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-configure-subnet-peering
- Microsoft Learn, Azure virtual network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn, create/change/delete Azure virtual network peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn, Azure virtual network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn, `az network vnet peering`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering?view=azure-cli-latest
- Microsoft Learn, `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Terraform Registry, `azurerm_virtual_network_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- Microsoft Learn, ARM/Bicep reference for `Microsoft.Network/virtualNetworks/virtualNetworkPeerings`: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/virtualnetworks/virtualnetworkpeerings

## Issues Found
- The post described standard full-VNet peering rather than Azure subnet peering. I updated the description, introduction, address-planning guidance, CLI section title, and conclusion so the article now matches Azure's subnet peering feature, which peers specific subnets instead of entire virtual network address spaces.
- The prerequisites were inaccurate and outdated. The original version required non-overlapping VNets, used the retired "Azure AD" name, and listed `Contributor` access. I corrected this to subnet-peering-specific requirements: participating subnets must be unique across peering links, the subscription must be allowlisted for subnet peering, Azure CLI 2.31.0 or later is required for the CLI workflow, Microsoft Entra terminology is current, and `Network Contributor` is the documented role.
- The Azure CLI examples created regular VNet peerings, not subnet peerings. I fixed both commands to use the current CLI parameters `--peer-complete-vnets false`, `--local-subnet-names`, and `--remote-subnet-names`, and updated the verification query to inspect the configured subnet lists.
- The Terraform examples also created full-VNet peerings. I updated them to use `peer_complete_virtual_networks_enabled = false` plus `local_subnet_names` and `remote_subnet_names`, which are the current subnet-peering arguments in the `azurerm_virtual_network_peering` resource.
- The NSG example allowed traffic from the entire remote VNet range even though the article is about subnet peering. I narrowed the example to the specific peered subnet CIDR and updated the surrounding explanation so it reflects subnet-scoped connectivity.

## Review Notes
- Microsoft Learn currently documents subnet peering as a feature that still requires subscription allowlisting and notes current limitations. This post now reflects that requirement, but it should be revisited if Microsoft later changes the rollout or removes feature-gating.
- Microsoft Learn's subnet-peering article and the current Azure CLI reference use slightly different spellings for the "peer complete vnet" option. The post now uses the current Azure CLI reference spelling, `--peer-complete-vnets`.
