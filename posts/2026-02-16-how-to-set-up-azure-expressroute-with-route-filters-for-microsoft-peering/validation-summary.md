# Validation Summary: How to Set Up Azure ExpressRoute with Route Filters for Microsoft Peering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure ExpressRoute
- ExpressRoute Microsoft peering
- ExpressRoute route filters
- BGP communities
- Azure CLI
- Cisco IOS BGP route filtering
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Configure route filters for Microsoft peering: https://learn.microsoft.com/en-us/azure/expressroute/how-to-routefilter-portal
- Microsoft Learn: Azure ExpressRoute routing requirements and BGP communities: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn: Azure CLI `az network route-filter rule`: https://learn.microsoft.com/en-us/cli/azure/network/route-filter/rule
- Microsoft Learn: Azure CLI `az network route-filter`: https://learn.microsoft.com/en-us/cli/azure/network/route-filter
- Microsoft Learn: Azure CLI `az monitor metrics`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Supported metrics for Microsoft.Network/expressRouteCircuits: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-expressroutecircuits-metrics

## Issues Found
- The Microsoft 365 public-cloud BGP community values were incorrect. Updated Exchange Online, SharePoint Online, Skype/Teams, Microsoft Entra ID, other Office 365 services, and Dynamics/CRM values to match current Microsoft Learn documentation.
- The post showed multiple route-filter rules, but Azure route filters support only one Allow rule. Reworked the examples to create and update a single rule containing multiple communities.
- The Azure CLI examples used the obsolete/nonexistent `--route-filter-type Community` option. Removed it from the route-filter rule commands.
- The West Europe regional community example was incorrect. Changed it from `12076:51012` to `12076:51002`.
- The Dynamics 365 examples used an incorrect service community. Updated the text to distinguish CRM Online for Dynamics v8.2 and earlier (`12076:5040`) from newer Dynamics deployments that should use the appropriate regional community.
- The Cisco IOS filtering snippet used the wrong Exchange community and omitted `ip bgp-community new-format`. Corrected the community values and added the required display/configuration format directive.
- The Azure Monitor metrics example referenced route-count metrics that are not supported on `Microsoft.Network/expressRouteCircuits`. Replaced them with supported circuit metrics and clarified that route-count changes should be tracked from the route-table output.
- Added the prerequisite that Microsoft 365 ExpressRoute communities require authorization.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was validated against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
