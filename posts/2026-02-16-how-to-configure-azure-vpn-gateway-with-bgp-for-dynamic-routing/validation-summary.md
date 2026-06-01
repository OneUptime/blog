# Validation Summary: How to Configure Azure VPN Gateway with BGP for Dynamic Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Azure CLI
- Border Gateway Protocol (BGP)
- Site-to-site IPsec VPN
- Azure Local Network Gateway
- Cisco IOS BGP configuration

## Sources Consulted
- Microsoft Learn: Configure BGP for Azure VPN Gateway with Azure CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-how-to-cli
- Microsoft Learn: Azure VPN Gateway FAQ - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq
- Microsoft Learn: About BGP with Azure VPN Gateway - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-bgp-overview
- Microsoft Learn: About active-active mode VPN gateways - https://learn.microsoft.com/en-us/azure/vpn-gateway/about-active-active-gateways
- Microsoft Learn: Create a route-based VPN gateway with Azure CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Microsoft Learn: Azure CLI reference for `az network vnet-gateway` - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: Azure CLI reference for `az network local-gateway` - https://learn.microsoft.com/en-us/cli/azure/network/local-gateway
- Microsoft Learn: Azure CLI reference for `az network vpn-connection` - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection

## Issues Found
- The post described the private ASN range as `64512-65534` when choosing a replacement Azure-side ASN. Microsoft documents Azure's usable private ASN ranges as `64512-65514` and `65521-65534`, with several Azure-reserved and IANA-reserved ASNs excluded. Updated the sentence to use the documented usable ranges.
- The post said local network gateway address prefixes could be included as a fallback if BGP goes down. Microsoft documents that when additional prefixes are added in the address space field, they are added as static routes in addition to BGP-learned routes. Updated the wording to avoid implying an automatic fallback behavior.

## Review Notes
The Azure CLI command names and flags in the post match the current Azure CLI documentation. The local Azure CLI executable was not installed in this workspace, so command syntax was verified against Microsoft Learn CLI reference pages instead of local `az --help` output.
