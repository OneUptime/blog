# Validation Summary: How to Create Azure Front Door in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Front Door Standard/Premium
- Azure CDN Front Door origins, origin groups, endpoints, routes, and custom domains
- Azure Web Application Firewall on Front Door
- Azure DNS records

## Sources Consulted
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_profile`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_profile
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_origin_group`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_origin_group
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_origin`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_origin
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_endpoint`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_endpoint
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_route`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_route
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_custom_domain`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_custom_domain
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_firewall_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_firewall_policy
- HashiCorp Terraform Registry / AzureRM provider docs for `azurerm_cdn_frontdoor_security_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/cdn_frontdoor_security_policy
- Microsoft Learn, Azure Web Application Firewall on Azure Front Door: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/afds-overview
- Microsoft Learn, Azure Front Door route matching: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-route-matching
- Microsoft Learn, Azure Front Door and Azure CDN comparison: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison

## Issues Found
- Corrected the Front Door profile comment from saying Premium includes WAF to saying Premium includes managed WAF rules and Bot Manager. Azure Front Door Standard supports WAF custom rules, while full WAF capabilities including managed rule sets are Premium-only.
- Corrected the route comment that said the route links both custom domains and WAF. Custom domains are associated with the route, but the WAF policy is associated through `azurerm_cdn_frontdoor_security_policy`.
- Corrected the custom domain DNS note to mention the DNS TXT validation record in addition to the CNAME record. The AzureRM provider docs require TXT validation when managing DNS validation records for a Front Door custom domain.
- Corrected the Standard vs Premium comparison to state that Standard supports WAF custom rules and Premium adds managed WAF rules, Bot Manager, Private Link origins, and enhanced analytics.

## Review Notes
The Terraform resource arguments and values are consistent with AzureRM provider 3.80.0 documentation. The examples still use placeholder hostnames and domains, so they were reviewed for provider schema and Azure behavior rather than applied against a live Azure subscription.
