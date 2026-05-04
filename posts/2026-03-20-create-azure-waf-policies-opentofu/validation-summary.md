# Validation Summary: How to Create Azure WAF Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Azure WAF (Web Application Firewall)
- Azure Application Gateway (WAF_v2 SKU)
- Azure Front Door (Premium tier)
- azurerm Terraform provider (~> 3.0)
- OWASP Core Rule Set 3.2
- Microsoft Default Rule Set 2.1
- Microsoft Bot Manager Rule Set 1.0

## Sources Consulted
- HashiCorp azurerm provider docs for `azurerm_web_application_firewall_policy`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/web_application_firewall_policy.html.markdown
- HashiCorp azurerm provider docs for `azurerm_cdn_frontdoor_firewall_policy`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/cdn_frontdoor_firewall_policy.html.markdown
- HashiCorp azurerm provider docs for `azurerm_application_gateway`
- Microsoft Azure docs on WAF policy schema, OWASP CRS versions, and Front Door managed rule sets

## Issues Found
1. **Incorrect rate limit fields on `azurerm_web_application_firewall_policy` custom_rules block.** The post used `rate_limit_duration_in_minutes = 1`, which is the correct schema for Front Door (`azurerm_cdn_frontdoor_firewall_policy`) but **not** for Application Gateway WAF. The Application Gateway resource expects `rate_limit_duration` accepting the enum values `"OneMin"` or `"FiveMins"`. Replaced `rate_limit_duration_in_minutes = 1` with `rate_limit_duration = "OneMin"`.
2. **Missing `group_rate_limit_by` for the per-IP rate limit rule.** The rule was named `RateLimitPerIP` but did not specify a grouping, so the rate limit would apply to aggregate traffic (default `"None"`) rather than per client IP. Added `group_rate_limit_by = "ClientAddr"` to match the rule's stated intent.

## Review Notes
- The post pins `azurerm = "~> 3.0"`. The current major version of the provider is 4.x; the schema fields used here remain valid in v4.x but readers may want to upgrade for new features.
- Both `firewall_policy_id` and a `waf_configuration` block are present on `azurerm_application_gateway`. This is technically allowed (firewall_policy_id supersedes the inline configuration), but the `waf_configuration` block is redundant once a policy is attached and could be removed in production code.
- The `exclusion` block on the managed_rules disables matches whose `RequestHeaderNames` equals `user-agent`. This is syntactically correct; in practice you would scope this further with `excluded_rule_set` to avoid suppressing the rule globally.
- All managed rule set identifiers and versions referenced (`OWASP 3.2`, `Microsoft_DefaultRuleSet 2.1`, `Microsoft_BotManagerRuleSet 1.0`) are valid for their respective resources at time of review.
- `custom_block_response_status_code = 429` is valid for the Front Door policy (allowed values: 200, 403, 405, 406, 429).
