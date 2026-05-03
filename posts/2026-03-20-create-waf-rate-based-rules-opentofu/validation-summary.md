# Validation Summary: How to Create WAF Rate-Based Rules with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- AWS WAFv2 (`aws_wafv2_web_acl`)
- AWS WAFv2 rate-based statements
- AWS CloudWatch metric alarms (`aws_cloudwatch_metric_alarm`)
- AWS SNS (referenced as alarm action target)
- HCL configuration language

## Sources Consulted
- Terraform AWS provider documentation for `aws_wafv2_web_acl` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)
- AWS WAFv2 API Reference — `RateBasedStatement`, `ForwardedIPConfig`, `ByteMatchStatement`, `FieldToMatch`, `TextTransformation`
- AWS WAF Developer Guide — rate-based rule statements and evaluation windows
- AWS CloudWatch metrics for `AWS/WAFV2` namespace (dimensions: `WebACL`, `Region`, `Rule`)
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`

## Issues Found
No technical issues found.

All HCL syntax, resource arguments, nested block structures, and configuration values were verified against the official Terraform AWS provider and AWS WAFv2 API documentation:

- `aws_wafv2_web_acl` with `scope = "REGIONAL"`, `default_action`, `rule`, and `visibility_config` blocks — correct.
- `rate_based_statement` with `limit`, `aggregate_key_type` (`IP`, `FORWARDED_IP`), `forwarded_ip_config` (`header_name`, `fallback_behavior` = `MATCH`), and nested `scope_down_statement` — all valid.
- `byte_match_statement` with `field_to_match { uri_path {} }`, `positional_constraint = "STARTS_WITH"`, `search_string`, and `text_transformation { priority, type = "LOWERCASE" }` — correct.
- The default evaluation window of 5 minutes (300 seconds) for rate-based rules is accurate.
- CloudWatch alarm uses correct namespace (`AWS/WAFV2`), valid metric (`BlockedRequests`), and correct rule-level dimensions (`WebACL`, `Region`, `Rule`).

## Review Notes
- The post does not mention the optional `evaluation_window_sec` argument (valid values: 60, 120, 300, 600), which can shorten or lengthen the rate evaluation window. The default of 300s is implicit and matches the post's narrative, so this is not an error — only a future enhancement opportunity.
- The minimum permitted value for `rate_based_statement.limit` was lowered by AWS from 100 to 10. The post does not claim 100 is the minimum (it simply uses 100 as a recommended threshold for login endpoints), so this is not incorrect — but readers should know lower values are now permitted if they want stricter limits.
- `aggregate_key_type` also supports `CONSTANT` and `CUSTOM_KEYS` in addition to `IP` and `FORWARDED_IP`. The post's coverage of just `IP` and `FORWARDED_IP` is appropriate for the scope but not exhaustive.
- The `scope_down_statement` example references the exact `aws_wafv2_web_acl.api_protected.name` in CloudWatch dimensions, which is correct usage. The example assumes `aws_sns_topic.security_alerts` and `var.region` are defined elsewhere — readers should know to provide those.
