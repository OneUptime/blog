# Validation Summary: How to Set Up Azure CDN with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure Front Door Standard/Premium
- Azure DNS
- Azure Storage static website origins
- CDN caching and HTTPS configuration

## Sources Consulted
- HashiCorp AzureRM provider docs: `azurerm_cdn_frontdoor_profile`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_profile.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_cdn_frontdoor_origin`, `azurerm_cdn_frontdoor_route`, `azurerm_cdn_frontdoor_rule`, `azurerm_cdn_frontdoor_custom_domain`, `azurerm_cdn_frontdoor_custom_domain_association`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_route.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_rule.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_custom_domain.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_custom_domain_association.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_storage_account`, `azurerm_cdn_endpoint`, and `azurerm_cdn_endpoint_custom_domain`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_endpoint.html.markdown  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_endpoint_custom_domain.html.markdown
- Microsoft Learn: Configure a custom domain on Azure Front Door Standard/Premium  
  https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-add-custom-domain
- Microsoft Learn: Compare Azure Front Door and Azure CDN services  
  https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/tier-comparison
- Microsoft Learn: TLS encryption / custom certificate guidance for Azure Front Door  
  https://learn.microsoft.com/en-us/azure/frontdoor/end-to-end-tls
- Microsoft Learn: Azure Front Door (classic) to Standard/Premium migration overview  
  https://learn.microsoft.com/en-us/azure/frontdoor/tier-migration

## Issues Found
- The original main example used classic Azure CDN resources (`azurerm_cdn_profile` and `azurerm_cdn_endpoint`) for a new setup. That is no longer appropriate in 2026 because classic Azure CDN is legacy, `Standard_Microsoft` new profile creation is no longer available for new deployments, and Microsoft now directs new workloads to Azure Front Door Standard/Premium. I replaced the main example with current Front Door Standard/Premium resources.
- The original classic CDN endpoint example set `is_http_allowed = false` and also defined an HTTP-to-HTTPS redirect rule. Those two settings conflict because HTTP requests cannot be redirected if HTTP is disabled at the endpoint. I replaced that logic with a Front Door route that explicitly supports both `Http` and `Https` and enables `https_redirect_enabled = true`.
- The original custom domain example used `azurerm_cdn_endpoint_custom_domain` with `cdn_managed_https`. That is not appropriate for a new 2026 tutorial because Azure-managed certificates for classic Azure CDN stopped being supported on August 15, 2025. I replaced it with `azurerm_cdn_frontdoor_custom_domain`, DNS TXT validation, route association, and a CNAME record for Front Door Standard/Premium.
- The original Azure Front Door section was incomplete because it created a profile, endpoint, origin group, and origin but no route, so traffic would not actually be served. I added a working `azurerm_cdn_frontdoor_route`, plus a rule set and rule for cache-duration control.
- The original storage origin referenced `primary_blob_host` while the example was framed as a static site. I changed the origin to `primary_web_host`, which matches Azure Storage static website hosting.
- The post pinned an older AzureRM provider series (`~> 3.85`) even though the tutorial now relies on current Front Door resources and behavior. I updated the example to the current v4 provider line.

## Review Notes
The post is now technically valid as a new-deployment guide, but it is effectively a Front Door Standard/Premium tutorial because that is the supported Azure CDN path in May 2026. Classic Azure CDN remains relevant mainly for migration and maintenance of existing deployments ahead of the September 30, 2027 retirement.
