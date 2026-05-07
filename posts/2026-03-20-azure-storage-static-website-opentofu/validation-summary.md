# Validation Summary: How to Set Up Azure Storage Static Website Hosting with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure Storage static website hosting
- Azure Blob Storage
- Azure Front Door Standard/Premium
- Azure DNS
- Custom domains and TLS

## Sources Consulted
- AzureRM provider `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM provider `azurerm_storage_blob`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_blob
- AzureRM provider `azurerm_cdn_frontdoor_profile`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_profile
- AzureRM provider `azurerm_cdn_frontdoor_endpoint`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_endpoint
- AzureRM provider `azurerm_cdn_frontdoor_origin_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_origin_group
- AzureRM provider `azurerm_cdn_frontdoor_origin`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_origin
- AzureRM provider `azurerm_cdn_frontdoor_route`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_route
- AzureRM provider `azurerm_cdn_frontdoor_rule_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_rule_set
- AzureRM provider `azurerm_cdn_frontdoor_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_rule
- AzureRM provider `azurerm_cdn_frontdoor_custom_domain`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain
- AzureRM provider `azurerm_cdn_frontdoor_custom_domain_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain_association
- Static website hosting in Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website
- Host a static website in Azure Storage: https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website-how-to
- Map a custom domain to an Azure Blob Storage endpoint: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name
- Integrate an Azure Storage account with Azure Front Door: https://learn.microsoft.com/en-us/azure/frontdoor/integrate-storage-account
- Origins and origin groups in Azure Front Door: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Comparison between Azure Front Door and Azure CDN services: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison

## Issues Found
- The post used Azure CDN Standard from Microsoft (classic) resources (`azurerm_cdn_profile`, `azurerm_cdn_endpoint`, and `azurerm_cdn_endpoint_custom_domain`). Microsoft’s current guidance says new Azure CDN Standard from Microsoft (classic) profile creation and new domain onboarding stopped on August 15, 2025, so I replaced the example with the current Azure Front Door Standard resources (`azurerm_cdn_frontdoor_*`).
- The original caching example used Azure CDN classic `delivery_rule` syntax. I translated it to the current Azure Front Door rule set and rule resources while keeping the intended 7-day cache override for `/assets/` paths.
- The original custom-domain example relied on CDN-managed HTTPS for the classic CDN service. Microsoft’s current guidance says managed certificates for Azure CDN Standard from Microsoft (classic) stopped being supported on August 15, 2025, with previously renewed certificates remaining valid only until April 14, 2026. I replaced that with a Front Door managed certificate configuration and the required route association.
- The original custom-domain snippet omitted the DNS TXT validation record and CNAME record required for current Front Door custom-domain onboarding. I added both Azure DNS resources and noted that equivalent DNS records are required when DNS is hosted outside Azure DNS.
- The blob upload examples used `source` only. AzureRM’s storage blob docs explicitly recommend pairing local-file uploads with `content_md5`, so I added `content_md5 = filemd5(...)` to ensure content changes to `index.html` and `404.html` are detected by OpenTofu.

## Review Notes
- Microsoft Learn’s Azure Storage static website article still references Azure CDN for custom domains and HTTPS, but Microsoft’s current Azure Front Door/CDN comparison page directs new post-August 15, 2025 deployments to Azure Front Door Standard or Premium. The updated post follows that newer platform guidance.
- `tofu` and `terraform` were not installed in the review environment, so validation was documentation-based rather than CLI schema-based.
