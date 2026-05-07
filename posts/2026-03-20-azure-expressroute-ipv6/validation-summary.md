# Validation Summary: How to Configure Azure ExpressRoute IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure ExpressRoute
- Azure Virtual Network (VNet) dual-stack IPv4/IPv6 configuration
- Azure ExpressRoute private peering and BGP
- Azure CLI
- Terraform `azurerm` provider

## Sources Consulted
- Microsoft Learn: Azure ExpressRoute - Add IPv6 support for private peering — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-add-ipv6
- Microsoft Learn: Azure CLI `az network express-route peering` reference — https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering?view=azure-cli-lts
- Microsoft Learn: Connect a virtual network to an ExpressRoute circuit using Azure CLI — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-linkvnet-cli
- Microsoft Learn: About ExpressRoute virtual network gateways — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Azure virtual network traffic routing — https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: Add a dual-stack network to an existing virtual machine — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/add-dual-stack-ipv6-vm-portal
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure CLI `az network nic show-effective-route-table` reference — https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Terraform Registry: `azurerm_express_route_circuit_peering` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_peering

## Issues Found
- The introduction and prerequisites mixed AWS and Azure terminology (`VPC`, `IAM`) and described the connectivity model imprecisely. I corrected this to Azure VNets, Azure RBAC, and Azure-specific dual-stack/gateway requirements.
- The VNet IPv6 enablement section only updated VNet address space and used a generic `--add` pattern, but ExpressRoute IPv6 also requires IPv6 on the gateway subnet. I corrected the commands to show explicit dual-stack VNet and `GatewaySubnet` configuration.
- The ExpressRoute peering command used invalid CLI flags (`--primary-peer-address-prefix`, `--secondary-peer-address-prefix`) and invalid example IPv6 values. I replaced them with the current Azure CLI syntax: `--ip-version ipv6`, `--primary-peer-subnet`, `--secondary-peer-subnet`, and a required `--vlan-id`.
- The route-table step was technically incorrect for ExpressRoute. ExpressRoute IPv6 private peering relies on BGP propagation through the ExpressRoute gateway, and Azure documents that user-defined routes with next hop `VirtualNetworkGateway` are only supported for VPN gateways, not ExpressRoute gateways. I replaced that section with the required gateway update and VNet-to-circuit link step.
- The connectivity test used `ping6` and `grep` on effective routes. I changed this to `ping -6` and a direct `az network nic show-effective-route-table` command to keep the example aligned with documented Azure CLI usage.
- The Terraform example used the wrong schema for IPv6 peering. The current `azurerm_express_route_circuit_peering` resource requires IPv6 settings inside an `ipv6` block, and an IPv6-only example should set `ipv4_enabled = false`. I updated the example accordingly.
- The conclusion incorrectly stated that ExpressRoute IPv6 requires adding IPv6 routes in Azure route tables. I corrected it to reflect Azure’s documented model: dual-stack VNet/gateway setup, IPv6 private peering, and linking the ExpressRoute virtual network gateway to the circuit.

## Review Notes
- Existing non-zone-redundant ExpressRoute gateways can't be updated in place for IPv6 support; Microsoft documents that some older gateways must be recreated before enabling dual-stack ExpressRoute connectivity.
- The example `provider` and `peering-location` values are provider-specific and must match the actual ExpressRoute service provider metadata in the target Azure region.
- IPv6 workload subnets in Azure VNets must be `/64`; for the `GatewaySubnet`, Microsoft recommends `/64` or larger.
- `az network nic show-effective-route-table` only returns route output for a running VM NIC.
