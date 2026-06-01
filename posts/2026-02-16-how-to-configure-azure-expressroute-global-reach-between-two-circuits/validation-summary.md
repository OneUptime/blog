# Validation Summary: How to Configure Azure ExpressRoute Global Reach Between Two Circuits

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Azure ExpressRoute
- ExpressRoute Global Reach
- Azure private peering
- Azure CLI
- Hybrid networking

## Sources Consulted
- Microsoft Learn: About ExpressRoute Global Reach - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-global-reach
- Microsoft Learn: Azure ExpressRoute FAQ - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-faqs
- Microsoft Learn: Configure ExpressRoute Global Reach - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-set-global-reach
- Microsoft Learn: Azure CLI `az network express-route peering connection` - https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering/connection?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network express-route` - https://learn.microsoft.com/en-us/cli/azure/network/express-route?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network express-route auth` - https://learn.microsoft.com/en-us/cli/azure/network/express-route/auth?view=azure-cli-latest

## Issues Found
- The prerequisites said Global Reach required "/29 or larger subnets" and described two /29 subnets, one per circuit. Azure CLI documentation specifies `--address-prefix` as a /29 IP address space for the connection, so this was corrected to a single /29 IPv4 subnet for the Global Reach connection.
- The prerequisites did not mention the Premium SKU requirement for circuits in different geopolitical regions. Microsoft Learn states both circuits must be Premium SKU for Global Reach across different geopolitical regions, so this was added.
- The traffic flow section said the entire path stays within the Microsoft network. The provider access portions of an ExpressRoute path are not necessarily Microsoft-owned, so this was corrected to say the path uses private ExpressRoute connectivity and the Microsoft backbone.
- The limitations section said Global Reach does not support IPv6. Microsoft Learn now states IPv6 is supported for Global Reach, so this was corrected to note that the article's examples are IPv4 and IPv6 requires separate configuration.
- The limitations section stated a fixed maximum of 4 Global Reach connections per circuit. Current Microsoft documentation says Global Reach connections count against the ExpressRoute circuit connection limit, which varies by SKU and bandwidth, so this was corrected.

## Review Notes
- The Azure CLI commands and flags used in the post match the current Azure CLI reference. The `az network express-route list-route-tables` command is currently marked Preview in the Azure CLI reference, but the syntax shown is valid.
