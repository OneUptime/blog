# Validation Summary: How to Create Azure Front Door Rules with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Azure Front Door Standard/Premium
- AzureRM provider for OpenTofu/Terraform
- HCL infrastructure as code

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_profile`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_profile.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_endpoint.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_origin_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin_group.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_origin`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_route`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_route.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_rule_set`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_rule_set.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_cdn_frontdoor_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_rule.html.markdown
- OpenTofu `init` command docs: https://opentofu.org/docs/cli/init/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- Microsoft Learn, Azure Front Door service comparison: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft Learn, Azure Front Door Private Link: https://learn.microsoft.com/en-us/azure/frontdoor/private-link
- Microsoft Learn, Azure Front Door billing and tier behavior: https://learn.microsoft.com/en-us/azure/frontdoor/billing
- Microsoft Learn, Azure Front Door rule match conditions: https://learn.microsoft.com/en-us/azure/frontdoor/rules-match-conditions
- Microsoft Learn, Azure Front Door security headers with rule sets: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-add-security-headers
- Microsoft Learn, Azure Front Door origins and origin groups: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Microsoft Learn, Azure Front Door WAF: https://learn.microsoft.com/en-us/azure/frontdoor/web-application-firewall

## Issues Found
- The route example enabled `https_redirect_enabled = true` while `supported_protocols` only included `Https`. The current AzureRM provider docs require both `Http` and `Https` when automatic HTTP-to-HTTPS redirection is enabled, so the route was corrected.
- The route only referenced the primary origin in `cdn_frontdoor_origin_ids`. The provider docs require explicit origin references for associated origins to ensure correct provisioning and destruction ordering, so both origins were added.
- The rule example omitted the provider-required `depends_on` relationship to the origin group and origins. This was added to match the current `azurerm_cdn_frontdoor_rule` documentation.
- The rule name used hyphens (`add-cache-header`), but the current provider docs restrict Front Door rule names to letters and numbers. The rule name was changed to `addcacheheader`.
- The profile SKU comment implied Premium is required for WAF generally. Microsoft documentation distinguishes custom WAF rules from managed WAF rule sets: Standard supports custom WAF rules, while Premium is required for Private Link and managed WAF rule sets. The comment was corrected.

## Review Notes
- The OpenTofu commands in the post are valid as written: `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan`.
- The examples were checked against current AzureRM provider documentation and Microsoft Learn content available on 2026-05-07.
