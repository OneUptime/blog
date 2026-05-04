# Validation Summary: How to Create an Azure Virtual Network with an IPv4 Address Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Network (VNet)
- Azure CLI (`az network vnet`, `az group`, `az account`)
- Azure Resource Manager (ARM) templates
- IPv4 CIDR addressing
- Azure DNS configuration

## Sources Consulted
- Azure CLI reference for `az network vnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Azure VNet documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview
- "Are there any restrictions on using IP addresses within these subnets?" — Azure reserves 5 IPs per subnet (network, default gateway, 2 for DNS, broadcast): https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- ARM template reference for `Microsoft.Network/virtualNetworks` (apiVersion 2023-05-01): https://learn.microsoft.com/en-us/azure/templates/microsoft.network/virtualnetworks
- Azure CLI `--add` generic update parameter syntax: https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-generic-update

## Issues Found
No technical issues found.

Verified specifically:
- `az network vnet create` accepts `--address-prefix`, `--subnet-name`, `--subnet-prefix`, `--location` — correct.
- `az network vnet update --add addressSpace.addressPrefixes "172.16.0.0/24"` — correct generic-update syntax for appending to an array property.
- `az network vnet update --dns-servers ""` clears custom DNS servers — correct.
- ARM template `apiVersion: 2023-05-01` is a valid version for `Microsoft.Network/virtualNetworks`.
- Address math: /16 = 65,536 addresses; /24 = 256 total → 251 usable after Azure's 5 reservations; /27 = 32 total → 27 usable. All correct.
- Statement that "Azure reserves 5 IP addresses per subnet (first 4 and last 1)" — correct per Microsoft documentation.

## Review Notes
- The Gateway subnet example uses the name "Gateway" but Azure requires the subnet name to be exactly `GatewaySubnet` for VPN/ExpressRoute virtual network gateways. The post's table is conceptual planning rather than a deployment script, so this is an informational caveat rather than an error in any executable code.
- `--address-prefix` (singular) is accepted by `az network vnet create`; the newer `--address-prefixes` (plural) is also supported and accepts multiple space-separated CIDRs. Either form works.
- The introduction's claim that "private endpoints lives inside a VNet" is accurate — private endpoints consume IPs from a subnet inside a VNet.
