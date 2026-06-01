# Validation Summary: How to Configure Azure VPN Gateway for Coexistence with ExpressRoute

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure VPN Gateway
- Azure ExpressRoute
- Azure Virtual Network Gateway
- Azure CLI
- BGP
- Azure Monitor metric alerts

## Sources Consulted
- Microsoft Learn: Configure ExpressRoute and S2S VPN coexisting connections: https://learn.microsoft.com/azure/expressroute/expressroute-howto-coexist-resource-manager
- Microsoft Learn: Configure BGP for Azure VPN Gateway using Azure CLI: https://learn.microsoft.com/azure/vpn-gateway/bgp-how-to-cli
- Microsoft Learn: Azure VPN Gateway FAQ: https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-vpn-faq
- Microsoft Learn: Azure CLI reference for `az network vnet-gateway`: https://learn.microsoft.com/cli/azure/network/vnet-gateway
- Microsoft Learn: Azure CLI reference for `az network local-gateway`: https://learn.microsoft.com/cli/azure/network/local-gateway
- Microsoft Learn: Azure CLI reference for `az network vpn-connection`: https://learn.microsoft.com/cli/azure/network/vpn-connection
- Microsoft Learn: Azure CLI reference for `az network express-route peering`: https://learn.microsoft.com/cli/azure/network/express-route/peering
- Microsoft Learn: Azure VPN Gateway monitoring data reference: https://learn.microsoft.com/azure/vpn-gateway/monitor-vpn-gateway-reference
- Microsoft Learn: About Azure VPN Gateway: https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpngateways
- Microsoft Learn REST API reference for ExpressRoute circuit peering state: https://learn.microsoft.com/rest/api/expressroute/express-route-circuit-peerings/list

## Issues Found
- Removed the claim that ExpressRoute is preferred over VPN specifically because of a shorter AS path. Microsoft documents ExpressRoute as preferred over site-to-site VPN for identical routes, with longest-prefix match applied first, but the post should not attribute that preference to AS path length in this context.
- Removed `--local-address-prefixes 192.168.0.0/16` from the BGP local network gateway example. Azure documentation states that prefixes added to the local network gateway address space are added as static routes in addition to BGP-learned routes, so the example now leaves them empty for a BGP-based coexistence setup.
- Replaced the unsupported `az network express-route peering update --state Disabled/Enabled` examples with `--set state=Disabled/Enabled`. The Azure CLI reference does not expose a dedicated `--state` option for this command, while the ExpressRoute peering resource has a `state` property with `Enabled` and `Disabled` values.
- Fixed the monitoring example. The original command scoped a VPN gateway metric alert to the VPN connection resource and described a bandwidth metric as connection status. The example now scopes the alert to the virtual network gateway and uses the documented `BgpPeerStatus` metric.
- Updated the VPN gateway throughput statement to reflect current SKU/generation-dependent benchmark values, including VpnGw2AZ/Generation 2 at 1.25 Gbps and VpnGw5/VpnGw5AZ at 10 Gbps.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn CLI reference pages instead of local `az --help` output. The article remains an example-based guide; resource names, IP addresses, and the pre-shared key are placeholders and should be replaced before use.
