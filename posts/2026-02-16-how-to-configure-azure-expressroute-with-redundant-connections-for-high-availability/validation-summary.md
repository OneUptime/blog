# Validation Summary: How to Configure Azure ExpressRoute with Redundant Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure ExpressRoute
- Azure Virtual Network Gateway
- Azure CLI
- Border Gateway Protocol (BGP)
- Site-to-Site VPN
- Azure Monitor metrics alerts

## Sources Consulted
- Microsoft Learn: Azure ExpressRoute circuits and peering - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-circuit-peerings
- Microsoft Learn: Designing for high availability with ExpressRoute - https://learn.microsoft.com/en-us/azure/expressroute/designing-for-high-availability-with-expressroute
- Microsoft Learn: ExpressRoute routing requirements - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn: Link a virtual network to an ExpressRoute circuit using Azure CLI - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-linkvnet-cli
- Microsoft Learn: About ExpressRoute virtual network gateways - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Configure ExpressRoute and Site-to-Site coexisting connections - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-coexist-resource-manager
- Microsoft Learn: Azure CLI reference for `az network express-route` - https://learn.microsoft.com/en-us/cli/azure/network/express-route
- Microsoft Learn: Azure CLI reference for `az network vnet-gateway` - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: Supported metrics for Microsoft.Network/expressRouteCircuits - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-expressroutecircuits-metrics

## Issues Found
- The ExpressRoute gateway example manually created and attached a public IP. Current Microsoft documentation states that ExpressRoute virtual network gateways use an auto-assigned Microsoft-managed public IP in CLI and PowerShell flows, so the public IP creation and `--public-ip-addresses` argument were removed.
- The routing weight explanation was reversed. Azure sends traffic over the ExpressRoute connection with the highest routing weight, so the primary and secondary example values were corrected and the text now says higher weight means higher preference.
- The BGP sample used the first usable IP address in each /30 as the Microsoft neighbor. Microsoft documentation assigns the first usable IP to the customer router and the second usable IP to the MSEE router, so the neighbor addresses were corrected to `.2` and `.6` for each circuit.
- The BGP sample only showed one neighbor per circuit even though each ExpressRoute private peering has primary and secondary BGP sessions. The sample now includes both BGP neighbors for each circuit.
- The local preference explanation incorrectly described return traffic from Azure to on-premises. Local preference on the customer router controls on-premises-to-Azure path selection; Azure-to-on-premises preference should be controlled with Azure connection weight and BGP advertisements such as AS path prepending.
- The VPN backup section suggested using the same gateway with both ExpressRoute and VPN types. Coexistence uses separate ExpressRoute and route-based VPN gateways in the same VNet GatewaySubnet, or a separate peered VNet, so the guidance was corrected.

## Review Notes
- The Azure CLI executable was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages and current ExpressRoute documentation.
- The active-active section is valid for Azure-to-on-premises traffic when routes are advertised identically and connection weights are equal; ExpressRoute ECMP load balances per flow across a maximum of four circuits.
