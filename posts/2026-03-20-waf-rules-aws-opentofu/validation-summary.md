# Validation Summary: How to Configure WAF Rules with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_web_acl`, `aws_wafv2_ip_set`)
- AWS CloudFront (`aws_cloudfront_distribution`)
- AWS Managed Rule Groups (Common Rule Set, Known Bad Inputs)
- HashiCorp AWS Provider ~> 5.30

## Sources Consulted
- Terraform AWS Provider docs for `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS Provider docs for `aws_wafv2_ip_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_ip_set
- Terraform AWS Provider docs for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS WAF Developer Guide (Rule statements, rate-based rules, scope CLOUDFRONT vs REGIONAL)
- AWS Managed Rules documentation (AWSManagedRulesCommonRuleSet, AWSManagedRulesKnownBadInputsRuleSet)

## Issues Found
No technical issues found.

Verified specifically:
- `scope = "CLOUDFRONT"` correctly requires the provider to be in `us-east-1` — handled via the aliased provider.
- `ip_address_version = "IPV4"` is one of the two valid values (IPV4, IPV6).
- `rule_action_override` is the current syntax for overriding individual rule actions in a managed rule group (replaced the older deprecated `excluded_rule`).
- `managed_rule_group_statement` correctly requires both `name` and `vendor_name = "AWS"`.
- `rate_based_statement` with `aggregate_key_type = "IP"` and a `limit` of 1000 uses the default 5-minute evaluation window, so the comment "1000 requests per IP per 5 minutes" is accurate.
- `scope_down_statement` with `not_statement` wrapping `ip_set_reference_statement` is valid for exempting trusted IPs from rate limiting.
- `byte_match_statement` with `single_header`, `positional_constraint = "CONTAINS"`, and a `text_transformation` block (singular, repeatable) is correct for the AWS provider.
- `aws_cloudfront_distribution.web_acl_id` accepts a WAFv2 ARN (used here via `aws_wafv2_web_acl.main.arn`).
- `visibility_config` with `cloudwatch_metrics_enabled`, `metric_name`, and `sampled_requests_enabled` is correctly required at both the WebACL level and per-rule level.
- `default_action { allow {} }` and per-rule `action { block {} }` / `override_action { none {} }` are properly distinguished (rules with managed rule group statements use `override_action`; rules with other statements use `action`).

## Review Notes
- The example shows only the `~> 5.30` provider constraint; the `aws_wafv2_web_acl` resource has continued to evolve in 5.x — readers using a newer minor version (e.g., 5.70+) should still find this configuration valid.
- Newer versions of AWS WAF support a configurable `evaluation_window_sec` on `rate_based_statement` (60, 120, 300, 600). The post relies on the default 300s (5 minutes) which remains a sensible default.
- `single_header` matches case-insensitively on header name in WAF, but the `text_transformation` `LOWERCASE` is still appropriate to normalize the header *value* before the substring match.
- A minor improvement (not a correction): for production, the `BlockMaliciousUserAgents` substring "scanner" is illustrative only and would also block legitimate user agents containing that token — readers should adapt to a more specific list. The post's "Best Practices" section already implicitly covers this via the count-mode-first guidance.
