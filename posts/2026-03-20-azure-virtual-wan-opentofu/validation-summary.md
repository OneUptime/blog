# Validation Summary: How to Configure Azure Virtual WAN with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual WAN
- Azure Virtual Hub
- Azure VPN Gateway
- Azure VPN Site
- Azure CLI
- AzureRM provider

## Sources Consulted
- AzureRM provider docs for `azurerm_virtual_wan`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_wan.html.markdown
- AzureRM provider docs for `azurerm_virtual_hub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_hub.html.markdown
- AzureRM provider docs for `azurerm_virtual_hub_connection`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_hub_connection.html.markdown
- AzureRM provider docs for `azurerm_virtual_hub_route_table`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_hub_route_table.html.markdown
- AzureRM provider docs for `azurerm_vpn_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/vpn_gateway.html.markdown
- AzureRM provider docs for `azurerm_vpn_site`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/vpn_site.html.markdown
- AzureRM provider docs for `azurerm_vpn_gateway_connection`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/vpn_gateway_connection.html.markdown
- Azure CLI reference for `az network vhub`: https://learn.microsoft.com/en-us/cli/azure/network/vhub?view=azure-cli-latest
- Azure Virtual WAN FAQ: https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-faq
- About Virtual WAN gateway settings: https://learn.microsoft.com/en-us/azure/virtual-wan/gateway-settings
- Scenario: any-to-any: https://learn.microsoft.com/en-us/azure/virtual-wan/scenario-any-to-any
- Scenario: Route to shared services VNets: https://learn.microsoft.com/en-us/azure/virtual-wan/scenario-shared-services-vnet
- Securing internet access with routing intent: https://learn.microsoft.com/en-us/azure/virtual-wan/about-internet-routing
- Global transit network architecture: https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-global-transit-network-architecture
- About Virtual WAN pricing: https://learn.microsoft.com/en-us/azure/virtual-wan/pricing-concepts

## Issues Found
- The VNet connection examples enabled `internet_security_enabled = true` without configuring a Secured Virtual Hub or routing intent. I removed that setting because, as written, it implied hub-based internet inspection that the post did not actually configure.
- The VPN gateway example explicitly set BGP ASN `65515`. Current Azure Virtual WAN documentation states ASN changes for Virtual Hubs and Virtual WAN gateways are not supported, so I removed the explicit gateway `bgp_settings` block and left BGP configured on the branch site/connection side.
- The custom route table was created but never associated with any connection, so it would not affect routing. I associated `spoke_2` to the custom route table and configured branch route propagation so the custom table participates in routing.
- The scale-unit comment and conclusion overstated a few behaviors. I corrected the throughput wording to documented aggregate capacity, clarified that any-to-any routing depends on the default association/propagation behavior, noted that secured inspection requires routing intent, and replaced the unsupported fixed cost claim with guidance to use current pricing.

## Review Notes
- The `az network vhub` commands are current, but they rely on the Azure CLI `virtual-wan` extension. Microsoft documents that this extension auto-installs on first use with Azure CLI 2.55.0 or later.
- `tofu` was not installed in the local review environment, so I could not execute the deployment commands directly. Validation was performed against official provider and Microsoft documentation.
