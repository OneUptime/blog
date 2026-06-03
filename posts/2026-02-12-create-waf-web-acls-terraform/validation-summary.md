# Validation Summary: How to Create WAF Web ACLs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS WAFv2 Web ACLs
- AWS Managed Rules for AWS WAF
- Terraform AWS provider
- WAF rate-based rules
- WAF IP sets, geo match statements, and header inspection
- AWS CloudWatch Logs WAF logging
- Application Load Balancer and CloudFront WAF association patterns

## Sources Consulted
- Terraform AWS provider `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS provider source docs for `aws_wafv2_web_acl`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- Terraform AWS provider `aws_wafv2_web_acl_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association
- Terraform AWS provider source docs for `aws_wafv2_web_acl_logging_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_logging_configuration.html.markdown
- AWS WAF baseline managed rule groups: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- AWS WAF managed rule groups list: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
- AWS WAF Bot Control managed rule group: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- AWS WAF logging destinations: https://docs.aws.amazon.com/waf/latest/developerguide/logging-destinations.html
- AWS WAF CloudWatch Logs destination requirements: https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html

## Issues Found
- The post said `AWSManagedRulesCommonRuleSet` alone catches SQL injection. AWS documents SQL injection as a separate use-case-specific managed rule group (`AWSManagedRulesSQLiRuleSet`), while the Common Rule Set covers generally applicable vulnerabilities including XSS and other high-risk issues described in OWASP publications. Updated the claim to direct readers to add `AWSManagedRulesSQLiRuleSet` for SQL injection protection.
- The Web ACL evaluation description said the default action applies only if no rule matches. Count is non-terminating, so a request can match a count rule and still continue evaluation. Updated the wording to say the default action applies if no terminating rule action applies.
- The custom API key header example used a byte match for an empty string inside a `not_statement`, which is not a reliable way to require a non-empty header. Replaced it with a `size_constraint_statement` checking `x-api-key` is greater than zero bytes, negated by `not_statement` to block missing or empty headers.
- The CloudFront guidance only said to use `scope = "CLOUDFRONT"`. Terraform and AWS require CloudFront-scoped WAFv2 Web ACLs to be managed from `us-east-1`, and CloudFront association should use `web_acl_id` on the distribution instead of `aws_wafv2_web_acl_association`. Added those caveats inline.

## Review Notes
- The Terraform snippets use current WAFv2 resource/block names (`aws_wafv2_web_acl`, `managed_rule_group_statement`, `override_action`, `rate_based_statement`, `scope_down_statement`, `aws_wafv2_ip_set`, `aws_wafv2_web_acl_association`, and `aws_wafv2_web_acl_logging_configuration`).
- The CloudWatch log group prefix `aws-waf-logs-` is correct for WAF logging destinations.
- Bot Control can add additional AWS WAF costs and should be tested in count mode like the other managed rules; this is not a correctness issue in the post.
