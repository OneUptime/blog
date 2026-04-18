# Validation Summary: How to Set Up Web Application Firewall Rules with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_web_acl`, `aws_wafv2_web_acl_association`)
- AWS Managed Rule Groups (`AWSManagedRulesCommonRuleSet`, `AWSManagedRulesSQLiRuleSet`)
- GCP Cloud Armor (`google_compute_security_policy`)
- GCP preconfigured WAF rules (`evaluatePreconfiguredWaf`, ModSecurity CRS 3.3)
- OWASP Top 10 mitigations (SQL injection, XSS)
- Rate limiting patterns

## Sources Consulted
- Terraform AWS Provider docs: `aws_wafv2_web_acl` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS Provider docs: `aws_wafv2_web_acl_association`
- AWS WAF Developer Guide: Managed rule groups (AWS-AWSManagedRulesCommonRuleSet, SQLi rule set)
- AWS WAF Developer Guide: Rate-based rule statement and `evaluation_window_sec`
- Terraform Google Provider docs: `google_compute_security_policy` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- GCP Cloud Armor docs: Preconfigured WAF rules (sqli-v33-stable, xss-v33-stable) and `evaluatePreconfiguredWaf`
- GCP Cloud Armor docs: Rate limiting (`rate_limit_options`, `rate_limit_threshold`)

## Issues Found
No technical issues found. All verified:
- AWS WAFv2 `scope = "REGIONAL"` is valid (alternative: `CLOUDFRONT`).
- `rule_action_override` with `action_to_use { count {} }` is the current (non-deprecated) pattern, replacing the legacy `excluded_rule`.
- `SizeRestrictions_BODY` is a valid rule within `AWSManagedRulesCommonRuleSet`.
- `AWSManagedRulesSQLiRuleSet` is a valid AWS-vendored managed rule group.
- `rate_based_statement` with `limit = 2000` and `aggregate_key_type = "IP"` is correct; the default evaluation window is 300 seconds (5 minutes), matching the inline comment.
- `aws_wafv2_web_acl_association` is correct for associating with an ALB (it is not used for CloudFront, which matches the REGIONAL scope chosen).
- GCP Cloud Armor `evaluatePreconfiguredWaf('sqli-v33-stable'|'xss-v33-stable', {'sensitivity': 1})` expression syntax is correct.
- `rate_limit_options` with `conform_action`, `exceed_action`, `enforce_on_key`, and nested `rate_limit_threshold { count, interval_sec }` is correct syntax.
- `priority = 2147483647` (max int32) is the required priority for the Cloud Armor default catch-all rule.
- All actions used (`deny(403)`, `deny(429)`, `throttle`, `allow`) are valid Cloud Armor actions.

## Review Notes
- The post's title, description, and tags mention Azure WAF (`Azure WAF`, "across AWS, Azure, and GCP"), but the body only contains AWS and GCP sections. This is a scope/content mismatch rather than a technical inaccuracy; per the review guidelines to not add new sections or restructure, it was left as-is. Future revision could either add an `azurerm_web_application_firewall_policy` example or trim the Azure references from the tags/description.
- The AWS rate-based rule uses the default 5-minute evaluation window. If a shorter window is desired, `evaluation_window_sec` can be explicitly set to 60, 120, 300, or 600.
- The managed rule groups are auto-updated by AWS; users should monitor release notes for rule set version bumps that may require overrides.
- GCP preconfigured WAF rules use ModSecurity CRS 3.3 (`v33-stable`). Newer tuned rulesets may be released; users should check Cloud Armor release notes periodically.
