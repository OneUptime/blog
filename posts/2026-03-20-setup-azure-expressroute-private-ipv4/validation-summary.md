# Validation Summary: How to Set Up Azure ExpressRoute for Private IPv4 Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure ExpressRoute
- Azure CLI
- Azure Virtual Network Gateway
- Azure private peering
- Microsoft peering route filters
- BGP
- IPv4

## Sources Consulted
- Microsoft Learn: What is Azure ExpressRoute? https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction
- Microsoft Learn: ExpressRoute circuits and peering. https://learn.microsoft.com/en-us/azure/expressroute/expressroute-circuit-peerings
- Microsoft Learn: Quickstart: Create and modify an ExpressRoute circuit using Azure CLI. https://learn.microsoft.com/en-us/azure/expressroute/howto-circuit-cli
- Microsoft Learn: Configure peering for ExpressRoute circuit using Azure CLI. https://learn.microsoft.com/en-us/azure/expressroute/howto-routing-cli
- Microsoft Learn: Link a VNet to an ExpressRoute circuit using Azure CLI. https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-linkvnet-cli
- Microsoft Learn: About ExpressRoute virtual network gateways. https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Configure a virtual network gateway for ExpressRoute. https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-add-gateway-resource-manager
- Microsoft Learn: Configure route filters for Microsoft peering. https://learn.microsoft.com/en-us/azure/expressroute/how-to-routefilter-portal
- Microsoft Learn: ExpressRoute routing requirements. https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn Azure CLI reference: az network express-route. https://learn.microsoft.com/en-us/cli/azure/network/express-route
- Microsoft Learn Azure CLI reference: az network express-route peering. https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering
- Microsoft Learn Azure CLI reference: az network vnet-gateway. https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn Azure CLI reference: az network vpn-connection. https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Microsoft Learn Azure CLI reference: az network route-filter rule. https://learn.microsoft.com/en-us/cli/azure/network/route-filter/rule

## Issues Found
- The introduction said ExpressRoute throughput was up to 100 Gbps. Updated it to distinguish provider circuits, which support up to 10 Gbps, from ExpressRoute Direct, which supports dual 10-Gbps, 100-Gbps, or 400-Gbps connectivity.
- The circuit provisioning instructions told readers to wait for `circuitProvisioningState` to become `Provisioned`. Corrected this to wait for `serviceProviderProvisioningState` to become `Provisioned` while `circuitProvisioningState` is `Enabled`.
- The ExpressRoute gateway step created and supplied a customer-managed public IP. Removed that step because current ExpressRoute virtual network gateway deployments through CLI/PowerShell use an auto-assigned Microsoft-managed public IP for normal gateway deployments.
- The route table verification command used `--device-path`, which is not the current documented Azure CLI option. Changed it to `--path primary`.
- The SKU table labeled VNet-link limits as "Max Circuits per VNet" and showed Premium as 10. Corrected the table to describe VNet links per circuit: Standard supports 10, while Premium supports more than 10 depending on bandwidth.
- The Microsoft peering route filter example created a filter and rule but did not attach it to Microsoft peering. Added the `az network express-route peering update --route-filter` command and clarified that Microsoft peering must already exist.

## Review Notes
Azure CLI is not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages and ExpressRoute documentation. The `az network express-route list-route-tables` and `az network route-filter rule` command groups are documented as preview in the current CLI reference.
