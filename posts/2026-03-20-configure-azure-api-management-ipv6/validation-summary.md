# Validation Summary: How to Configure Azure API Management with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure API Management
- Azure Front Door Standard/Premium
- Azure Application Gateway v2
- Azure CLI
- Terraform (`hashicorp/azurerm`)
- IPv6
- APIM policy expressions

## Sources Consulted
- Microsoft Learn: Configure Front Door Standard/Premium in front of Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/front-door-api-management
- Microsoft Learn: Quickstart: Create an Azure Front Door using Azure CLI - https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Endpoints in Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/endpoint
- Microsoft Learn: `az afd route` - https://learn.microsoft.com/en-us/cli/azure/afd/route?view=azure-cli-latest
- Microsoft Learn: Configure Application Gateway with a frontend public IPv6 address using the Azure portal - https://learn.microsoft.com/en-us/azure/application-gateway/ipv6-application-gateway-portal
- Microsoft Learn: Azure Application Gateway frontend IP address configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-frontend-ip
- Microsoft Learn: Quickstart: Create a public IP - Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-cli
- Microsoft Learn: `az network application-gateway frontend-ip` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/frontend-ip?view=azure-cli-latest
- Microsoft Learn: `az network application-gateway listener` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/listener?view=azure-cli-latest
- Microsoft Learn: `az network application-gateway rule` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule?view=azure-cli-lts
- Microsoft Learn: API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: HTTP headers and Azure Front Door - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-http-headers-protocol
- Microsoft Learn: How Application Gateway works - https://learn.microsoft.com/en-us/azure/application-gateway/how-application-gateway-works
- HashiCorp AzureRM provider docs (raw source): `azurerm_api_management` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management.html.markdown
- HashiCorp AzureRM provider docs (raw source): `azurerm_cdn_frontdoor_origin` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin.html.markdown
- HashiCorp AzureRM provider docs (raw source): `azurerm_cdn_frontdoor_origin_group` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin_group.html.markdown
- HashiCorp AzureRM provider docs (raw source): `azurerm_cdn_frontdoor_route` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_route.html.markdown

## Issues Found
- The description and introduction incorrectly implied that APIM gains IPv6 through dual-stack VNet integration itself, or that VNet placement is generally required. I corrected this to explain that IPv6 exposure comes from the frontend service in front of APIM.
- The Front Door section was incomplete for Azure Front Door Standard/Premium because it created a profile, endpoint, origin group, and origin but no route. I added the missing `az afd route create` command and aligned the health probe with the documented APIM status endpoint using HTTPS and `GET`.
- The Front Door verification examples used an invalid default endpoint hostname pattern. Azure Front Door endpoint hostnames include a generated hash, so I changed the examples to use the assigned endpoint hostname rather than `my-api-endpoint.z01.azurefd.net`.
- The Application Gateway section suggested that adding an IPv6 frontend IP alone was sufficient. I corrected the guidance to match Microsoft’s current IPv6 Application Gateway behavior: dual stack requires a new v2 gateway in a dual-stack VNet, and you must bind a listener and routing rule to the IPv6 frontend.
- The Terraform example was incomplete and would not work as written. I added the required Front Door route resource, added the APIM health probe block, added the required `certificate_name_check_enabled` field, and corrected `host_name` and `origin_host_header` so they use the APIM gateway hostname instead of the full `gateway_url` with the `https://` scheme.
- The APIM policy example logged `context.Request.IpAddress`, which is not the original client address once APIM is behind Front Door or Application Gateway. I changed the example to prefer the forwarded client IP headers that those services add, with fallback to `context.Request.IpAddress`.

## Review Notes
- The Front Door guidance is now accurate for current Front Door Standard/Premium behavior and current APIM integration guidance, including the external-VNet requirement for classic network-injected APIM used as a public Front Door origin and the Private Link option in Front Door Premium.
- The Terraform examples were verified against current AzureRM provider documentation, using the provider's raw documentation source because the Terraform Registry pages are JavaScript-rendered in this environment.
- Local checks: `validation.json` was validated with `jq`. Live Azure deployment tests were not possible in this workspace.
