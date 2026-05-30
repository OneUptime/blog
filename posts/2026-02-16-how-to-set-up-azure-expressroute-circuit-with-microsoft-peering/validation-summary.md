# Validation Summary: How to Set Up Azure ExpressRoute Circuit with Microsoft Peering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure ExpressRoute
- Microsoft peering
- Azure Private Peering
- Azure CLI
- BGP routing and BGP communities
- ExpressRoute route filters
- Source NAT for Microsoft peering
- Azure Monitor metrics

## Sources Consulted
- Azure ExpressRoute routing requirements: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Configure route filters for Microsoft peering: https://learn.microsoft.com/en-us/azure/expressroute/how-to-routefilter-portal
- Azure CLI reference for `az network express-route`: https://learn.microsoft.com/en-us/cli/azure/network/express-route?view=azure-cli-latest
- Azure CLI reference for `az network express-route peering`: https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering?view=azure-cli-latest
- Azure CLI reference for `az network route-filter rule`: https://learn.microsoft.com/en-us/cli/azure/network/route-filter/rule?view=azure-cli-latest
- Azure ExpressRoute BFD documentation: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-bfd
- Azure ExpressRoute monitoring data reference: https://learn.microsoft.com/en-us/azure/expressroute/monitor-expressroute-reference

## Issues Found
- The post implied Microsoft 365 access over ExpressRoute was generally available through Microsoft peering. Updated the introduction to note that Microsoft 365 over ExpressRoute requires organization authorization.
- The prerequisites combined Microsoft peering BGP session IPs and advertised public prefixes into one `/29 or larger` requirement. Split this into BGP session subnet requirements and separately advertised public prefixes, matching Microsoft routing requirements.
- The ExpressRoute Standard SKU description said "single geo." Updated it to "same geopolitical region" and described Premium as global connectivity.
- The Microsoft peering example did not state that the documentation IP ranges are placeholders. Added a note to replace them with public prefixes assigned or authorized for the organization.
- The advertised public prefixes description only mentioned RIR registration. Updated it to include IRR registration or manual validation, matching Microsoft documentation.
- The route filter example created two route-filter rules. Azure route filters for Microsoft peering can have only one `Allow` rule, with a list of communities. Combined the communities into one rule.
- The BFD example used `az network express-route peering update --bfd-enabled true`, which is not a current Azure CLI option. Replaced it with guidance that BFD is enabled by default on new Microsoft peering interfaces on Microsoft's edge, and that customers configure BFD on their primary and secondary routers; older Microsoft peerings require a peering reset.

## Review Notes
- Azure CLI is not installed in the local environment, so CLI syntax was verified against current Microsoft Learn Azure CLI reference pages rather than local `az --help`.
- Microsoft 365 route filters require authorization; attaching route filters for those services fails without it.
- Route-filter BGP community values can change over time. The post includes common values, but production users should check `az network route-filter rule list-service-communities` or the current ExpressRoute routing requirements page.
