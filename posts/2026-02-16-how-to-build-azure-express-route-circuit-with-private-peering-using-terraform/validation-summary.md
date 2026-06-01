# Validation Summary: How to Build Azure Express Route Circuit with Private Peering Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure ExpressRoute
- Azure private peering
- Azure Virtual Network Gateway
- Azure route filters
- Azure Monitor diagnostic settings
- Terraform
- HashiCorp AzureRM provider

## Sources Consulted
- Microsoft Learn: Azure ExpressRoute routing requirements - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn: Configure peering for ExpressRoute circuit - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-routing-portal-resource-manager
- Microsoft Learn: Azure ExpressRoute FastPath - https://learn.microsoft.com/en-us/azure/expressroute/about-fastpath
- Microsoft Learn: About ExpressRoute virtual network gateways - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Configure route filters for Microsoft peering - https://learn.microsoft.com/en-us/azure/expressroute/how-to-routefilter-portal
- Microsoft Learn: Monitoring data reference for Azure ExpressRoute - https://learn.microsoft.com/en-us/azure/expressroute/monitor-expressroute-reference
- Terraform Registry: azurerm_express_route_circuit - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit
- Terraform Registry: azurerm_express_route_circuit_peering - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_peering
- Terraform Registry: azurerm_virtual_network_gateway - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- Terraform Registry: azurerm_virtual_network_gateway_connection - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Terraform Registry: azurerm_route_filter - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_filter
- Terraform Registry: azurerm_monitor_diagnostic_setting - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting

## Issues Found
- Corrected the private peering `/30` address explanation. Microsoft documentation assigns the first usable IP address to the customer router and the second usable IP address to the Microsoft router.
- Changed references from circuit status "Provisioned" to provider status "Provisioned", matching the ExpressRoute provisioning workflow terminology.
- Corrected the route filter BGP community examples. The previous values were labeled as Azure Storage and Azure SQL but corresponded to other Microsoft peering service communities; the examples now use East US 2 Azure Storage and Azure SQL community values.
- Updated the FastPath comment to include ErGwScale with at least 10 scale units, which is also supported by current Azure documentation.

## Review Notes
The Terraform examples use AzureRM `~> 3.80`, which is older than the current AzureRM provider major version but the resource arguments shown are still valid for the documented examples. Future updates could consider testing and refreshing the sample against AzureRM 4.x.
