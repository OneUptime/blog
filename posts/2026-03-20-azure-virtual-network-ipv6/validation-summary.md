# Validation Summary: How to Configure IPv6 in Azure Virtual Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Network (VNet)
- IPv6 dual-stack networking
- Azure CLI
- Terraform
- AzureRM provider
- VNet peering
- Azure ExpressRoute
- Azure VPN Gateway

## Sources Consulted
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Add a dual-stack network to an existing virtual machine - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/add-dual-stack-ipv6-vm-portal
- Microsoft Learn: Azure Virtual Network Peering overview - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Azure ExpressRoute: Add IPv6 support for private peering - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-add-ipv6-cli
- Microsoft Learn: Configure IPv6 for VPN Gateway - https://learn.microsoft.com/en-us/azure/vpn-gateway/ipv6-configuration
- Microsoft Learn: Conceptual planning for IPv6 networking - https://learn.microsoft.com/en-us/azure/architecture/networking/guide/ipv6-ip-planning
- HashiCorp AzureRM provider docs: `azurerm_virtual_network` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_subnet` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/subnet.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_virtual_network_peering` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network_peering.html.markdown
- HashiCorp AzureRM provider README - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/README.md

## Issues Found
- The introduction incorrectly stated that Azure uses `/48` IPv6 prefixes for VNets and implied Azure IPv6 addresses are always globally routable. Updated this to match current Azure guidance: VNet IPv6 space is user-defined, IPv6 subnets must be exactly `/64`, and internet reachability requires explicit public IPv6 configuration.
- The Terraform example pinned the AzureRM provider to `~> 3.0`, which is outdated relative to current AzureRM 4.x documentation. Updated the example to `~> 4.0`.
- The Azure CLI example for adding IPv6 to an existing VNet used invalid IPv6 placeholders and generic `--add` operations that omitted the existing IPv4 prefixes. Replaced it with the documented `--address-prefixes` form and valid sample IPv4/IPv6 CIDRs for both the VNet and subnet update commands.
- The peering example showed only one peering resource, but bidirectional Azure VNet peering requires peerings in both directions. Added the reverse peering resource.
- The considerations section stated VPN Gateway IPv6 dual-stack support without qualification. Updated it to note that Microsoft currently documents this capability as preview.

## Review Notes
- Azure documentation currently includes both step-by-step guidance for adding IPv6 to existing VNets and limitations language for some existing-resource scenarios. The updated post now matches the documented command pattern, but production changes should still be checked against the latest workload-specific Azure guidance.
- Azure CLI was not installed in this workspace, so CLI validation relied on current Microsoft Learn CLI documentation instead of local `az ... --help` output.
