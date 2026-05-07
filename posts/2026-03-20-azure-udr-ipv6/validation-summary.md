# Validation Summary: How to Configure Azure User-Defined Routes for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Network
- Azure User-Defined Routes (UDR) and route tables
- Azure CLI
- Terraform (`azurerm` provider)
- IPv6
- Network Virtual Appliances (NVAs)

## Sources Consulted
- Microsoft Learn: Azure virtual network traffic routing - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: `az network route-table create` - https://learn.microsoft.com/en-us/cli/azure/network/route-table?view=azure-cli-latest
- Microsoft Learn: `az network route-table route create` - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route?view=azure-cli-latest
- Microsoft Learn: `az network nic show-effective-route-table` - https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure Firewall known issues - https://learn.microsoft.com/en-us/azure/firewall/firewall-known-issues
- Microsoft Learn: Configure IPv6 in Dual Stack - Azure VPN Gateway - https://learn.microsoft.com/en-us/azure/vpn-gateway/ipv6-configuration
- Terraform Registry: `azurerm_route_table` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_table

## Issues Found
- The Azure CLI example comment said it was adding a route for a specific IPv6 prefix to the internet, but the command actually created an IPv4 default route through a virtual appliance. I corrected the comment to match the command.
- The post claimed that IPv6 UDR next hops must be IPv4 addresses. Current Microsoft routing documentation requires a directly reachable private next-hop IP for `VirtualAppliance` routes, but does not document that IPv4-only restriction. I removed that hard claim and rewrote the surrounding text to stay within the documented behavior.
- The Terraform example used Azure Firewall as the IPv6 inspection path. Current Microsoft documentation says Azure Firewall does not currently support IPv6, so I changed the example to use a generic NVA instead.
- The Terraform example included `VirtualNetworkGateway` routes described as keeping hub traffic local, and the IPv6 version used an unsupported pattern. Microsoft documents `VirtualNetworkGateway` UDR next hops separately from local virtual-network routing, and the VPN Gateway IPv6 documentation says IPv6 UDRs using a VPN gateway as the next hop are not currently supported. I removed those incorrect route blocks.
- The `az network nic show-effective-route-table` query used invalid JMESPath syntax and did not match the effective-route output shape. I fixed the filter and the projected fields so the example query is valid.
- The hub-spoke diagram used invalid IPv6 placeholder prefixes such as `fd00:hub::/48` and `fd00:spoke-a::/48`. I replaced them with valid IPv6 example prefixes.

## Review Notes
- Azure CLI was not installed in the workspace, so CLI commands were verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- The post now uses generic NVA examples for IPv6 traffic steering. That aligns with the current Azure IPv6 documentation and avoids implying Azure Firewall IPv6 support that Microsoft does not currently document.
