# Validation Summary: How to Create Azure CDN Endpoints with OpenTofu

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AzureRM provider
- Azure CDN (classic)
- Azure Storage static website hosting

## Sources Consulted
- AzureRM provider documentation: `azurerm_cdn_profile` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_profile.html.markdown
- AzureRM provider documentation: `azurerm_cdn_endpoint` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_endpoint.html.markdown
- AzureRM provider documentation: `azurerm_cdn_endpoint_custom_domain` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_endpoint_custom_domain.html.markdown
- AzureRM provider documentation: `azurerm_storage_account` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- Microsoft Learn: Azure Front Door FAQ https://learn.microsoft.com/en-us/azure/frontdoor/front-door-faq
- Microsoft Learn: Azure Front Door migration FAQ https://learn.microsoft.com/en-us/azure/frontdoor/migration-faq
- Microsoft Learn: Static website hosting in Azure Storage https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website
- OpenTofu CLI docs: `plan` https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `apply` https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The post is built around `azurerm_cdn_profile`, `azurerm_cdn_endpoint`, and `azurerm_cdn_endpoint_custom_domain`, which the AzureRM provider documents as CDN classic resources. The provider documentation also notes that `Standard_Microsoft` CDN classic profiles were deprecated on October 1, 2025 and are on the retirement path through September 30, 2027. I did not rewrite the post because that would require replacing the article’s core subject with Azure Front Door Standard/Premium resources, which is beyond a narrow technical correction.
- Microsoft Learn states that Azure CDN from Microsoft (classic) has not supported new domain onboarding, new profile creation, or Azure-managed certificates since August 15, 2025. Because this post is a create-from-scratch tutorial published for 2026 readers, its main workflow no longer works as described. I therefore classified it as `not-technically-relevant` instead of attempting piecemeal fixes.
- The custom domain example uses `cdn_managed_https`, but Microsoft Learn states that Azure-managed certificates for Azure CDN from Microsoft (classic) were no longer supported after August 15, 2025 and existing managed certificates were retired on April 14, 2026. As of the review date, May 7, 2026, that example is unusable.
- Even aside from the product retirement issue, the storage origin example is inconsistent: it enables the Storage static website feature but points the CDN origin at `primary_blob_host`. Azure Storage static website hosting uses the web endpoint/host (`primary_web_endpoint` / `primary_web_host`), not the blob endpoint, for the static website surface.

## Review Notes
- The `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` command flow is still correct according to the current OpenTofu CLI documentation.
- This post could only be made current by rewriting it around Azure Front Door Standard/Premium and the corresponding `azurerm_cdn_frontdoor_*` resources. That would materially change the article rather than correct isolated mistakes, so removal is the appropriate outcome for this review.
