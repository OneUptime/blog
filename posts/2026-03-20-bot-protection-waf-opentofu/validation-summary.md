# Validation Summary: How to Configure Bot Protection with WAF in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS WAFv2
- AWS Managed Rules Bot Control (`AWSManagedRulesBotControlRuleSet`)
- Amazon CloudWatch metric alarms
- Amazon SNS (referenced as an alarm target)

## Sources Consulted
- AWS WAF Bot Control overview: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control.html
- AWS WAF Bot Control rule group reference: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- AWS WAF metrics and dimensions: https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF ByteMatchStatement API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_ByteMatchStatement.html
- AWS WAF example for missing-header matching with `SizeConstraintStatement`: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rate-based-example-limit-missing-header.html
- AWS WAF size constraint statement guide: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-size-constraint-match.html
- Terraform AWS provider docs source for `aws_wafv2_web_acl`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- Terraform AWS provider docs source for `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Imperva / Thales 2024 Bad Bot Report announcement: https://www.businesswire.com/news/home/20240416225637/en/Bots-Now-Make-Up-Nearly-Half-of-All-Internet-Traffic-Globally

## Issues Found
- The introduction overstated what the Bot Control managed rule group does and mixed in protections that are not part of the COMMON inspection level shown in the code. I corrected the explanation to match AWS documentation: Bot Control labels bot traffic, verifies desirable bots, and COMMON vs. TARGETED have different capabilities.
- The `rule_action_override` comments claimed the configuration was allowing only verified Google, Bing, and monitoring bots. AWS documents that the category rules already do not match verified bots, so overriding `CategorySearchEngine` or `CategoryMonitoring` to `allow` would also allow unverified matches in those categories. I removed those misleading overrides.
- The snippet referenced `CategoryScraper`, which is not a valid Bot Control rule name. AWS documents category names such as `CategoryScrapingFramework`, `CategorySearchEngine`, and `CategoryMonitoring`; there is no `CategoryScraper`. Removing the invalid override fixes the example.
- The custom rule for missing `User-Agent` used `byte_match_statement` with `positional_constraint = "EXISTS"`, but AWS only allows `EXACTLY`, `STARTS_WITH`, `ENDS_WITH`, `CONTAINS`, and `CONTAINS_WORD` for byte matches. I replaced it with the documented `size_constraint_statement` pattern that checks for a `user-agent` header value and wraps it in `not_statement`.
- The CloudWatch alarm used `Rule = "AWSManagedRulesBotControlRuleSet"` as a metric dimension. AWS WAF metrics use the rule metric name for the `Rule` dimension, so I changed it to `BotControlRules`, which matches the rule's `visibility_config.metric_name`.

## Review Notes
- The post's `WebACL` CloudWatch dimension currently works because the web ACL `name` and `visibility_config.metric_name` are the same string (`bot-protected-web-acl`). If those values ever diverge, the dimension must use the web ACL metric name.
- `inspection_level = "COMMON"` is valid and appropriate for the example. Readers should know that more advanced Bot Control behavior such as browser interrogation and optional machine learning requires `TARGETED`.
- AWS charges additional fees for the Bot Control managed rule group.
