# Validation Summary: How to Create Azure CDN Profiles in Terraform

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure CDN classic profiles and endpoints
- Azure Storage Accounts and Blob containers
- Azure App Service origins
- CDN custom domains and managed HTTPS
- CDN delivery rules, compression, caching, and geo-filtering

## Sources Consulted
- Terraform Registry: azurerm_cdn_profile - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_profile
- Terraform Registry: azurerm_cdn_endpoint - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_endpoint
- Terraform Registry: azurerm_cdn_endpoint_custom_domain - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_endpoint_custom_domain
- Terraform Registry: azurerm_storage_account - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform Registry: azurerm_storage_container - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Microsoft Learn: Comparison between Azure Front Door and Azure Content Delivery Network - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Learn: About Azure CDN from Microsoft (classic) to Azure Front Door migration - https://learn.microsoft.com/en-us/azure/cdn/tier-migration
- Microsoft Learn: Azure CDN Standard from Akamai retirement Q&A - https://learn.microsoft.com/en-us/answers/questions/1365890/maintain-of-azure-cdn-endpoint-with-akamai-retirem
- Microsoft Learn: Azure CLI cdn profile command reference - https://learn.microsoft.com/en-us/cli/azure/cdn/profile

## Issues Found
- The tutorial is framed as guidance for creating new Azure CDN classic profiles with Terraform, but Microsoft Learn states that Azure CDN Standard from Microsoft (classic) no longer supports new profile creation or new domain onboarding as of August 15, 2025, and retires on September 30, 2027. The recommended path for new deployments is Azure Front Door Standard or Premium.
- The post recommends `Standard_Microsoft` as the best starting point for most new projects. That recommendation is outdated because new classic CDN profiles should not be created; Azure directs users to Azure Front Door Standard/Premium instead.
- The `sku` comment lists `Standard_Akamai`, but Azure CDN Standard from Akamai was retired on October 31, 2023 and is no longer available.
- The tier comparison describes Standard Akamai, Standard Verizon, and Premium Verizon as usable choices. Akamai is retired, and the Verizon/Edgio-backed Azure CDN service has also been retired. Presenting these as current options is misleading.
- The custom domain example uses Azure CDN managed HTTPS for a classic Microsoft CDN endpoint. Microsoft Learn states that Azure CDN Standard from Microsoft (classic) stopped supporting managed certificates for new use on August 15, 2025; existing managed certificates remain valid only until April 14, 2026.
- Because the article's central workflow is now obsolete for new deployments, correcting it would require a full rewrite around Azure Front Door Terraform resources rather than small targeted edits. I did not edit README.md because that would replace the article's subject instead of fixing discrete technical inaccuracies.

## Review Notes
Some individual Terraform arguments shown for classic CDN endpoints, such as `querystring_caching_behaviour`, `delivery_rule`, `cache_expiration_action`, `geo_filter`, and `cdn_managed_https`, still match the AzureRM provider schema for classic CDN resources. The problem is the service lifecycle and availability: the article teaches readers to create and recommend classic CDN profiles after Microsoft has moved new deployments to Azure Front Door Standard/Premium.
