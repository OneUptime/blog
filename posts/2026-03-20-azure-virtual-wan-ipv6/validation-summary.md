# Validation Summary: How to Configure Azure Virtual WAN IPv6

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (Azure networking walkthrough)

## Technologies Covered
- Azure Virtual WAN
- Azure Virtual Network (VNet)
- Azure ExpressRoute
- Azure CLI
- Terraform (`azurerm`)
- IPv6
- BGP
- Route tables

## Sources Consulted
- Azure Virtual Network IPv6 overview: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Azure Virtual WAN FAQ: https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-faq
- Azure ExpressRoute: Add IPv6 support for private peering: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-add-ipv6
- About ExpressRoute connections in Azure Virtual WAN: https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-expressroute-about
- About virtual hub routing: https://learn.microsoft.com/en-us/azure/virtual-wan/about-virtual-hub-routing
- Azure CLI `az network vhub route-table`: https://learn.microsoft.com/en-us/cli/azure/network/vhub/route-table?view=azure-cli-latest
- Terraform Registry `azurerm_express_route_circuit_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_peering

## Issues Found
- The post's core claim is false. Microsoft Learn's IPv6 overview states that Azure Virtual WAN currently supports IPv4 traffic only, and the Virtual WAN FAQ states that IPv6 isn't supported in the Virtual WAN hub and its gateways. That makes the title, introduction, conclusion, and all procedural steps incorrect for current Azure.
- The Virtual WAN FAQ also states that if you advertise IPv6 prefixes from on-premises into Virtual WAN, it breaks IPv4 connectivity for Azure resources. The post's "Configure IPv6 BGP" section instructs the opposite of Microsoft's guidance.
- Microsoft's ExpressRoute IPv6 documentation explicitly lists "Use of ExpressRoute with Virtual WAN" as an unsupported scenario. The ExpressRoute CLI and Terraform snippets may be valid for ordinary dual-stack ExpressRoute deployments, but they are not valid as a Virtual WAN procedure.
- The route section uses `az network route-table route create`, which manages subnet route tables in a VNet. Virtual WAN uses virtual hub routing and virtual hub route tables instead, with separate tooling such as `az network vhub route-table`.
- The VNet prerequisite and address-space steps are generic Azure Virtual Network dual-stack configuration, not a Virtual WAN IPv6 feature. A spoke VNet can have IPv6 space, but Microsoft documents that only IPv4 connectivity works through Virtual WAN.
- No changes were made to `README.md`. Making this post correct would require rewriting it into a different article, such as a guide for dual-stack Azure Virtual Network and ExpressRoute outside Virtual WAN, or an article explaining Virtual WAN's current lack of IPv6 support.

## Review Notes
- The sample IPv6 prefixes under `2001:db8::/32` are documentation prefixes and are acceptable in examples; they are not the reason for the failure.
- If Azure adds IPv6 support to Virtual WAN in the future, every command, routing step, and Terraform example in this post should be revalidated against the then-current Microsoft documentation before publication.
