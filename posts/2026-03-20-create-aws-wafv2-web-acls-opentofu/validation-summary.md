# Validation Summary: How to Create AWS WAFv2 Web ACLs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_web_acl`, `aws_wafv2_web_acl_association`, `aws_wafv2_web_acl_logging_configuration`)
- AWS Managed Rule Groups (Common Rule Set, Known Bad Inputs Rule Set)
- AWS CloudWatch Logs (`aws_cloudwatch_log_group`)
- AWS Application Load Balancer (association target)

## Sources Consulted
- HashiCorp AWS provider docs: `aws_wafv2_web_acl` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)
- HashiCorp AWS provider docs: `aws_wafv2_web_acl_association`
- HashiCorp AWS provider docs: `aws_wafv2_web_acl_logging_configuration` (source markdown on GitHub: hashicorp/terraform-provider-aws)
- AWS WAF Developer Guide on Managed Rule Groups and logging requirements

## Issues Found
No technical issues found.

Verified:
- `scope` accepts `REGIONAL` (ALB/API GW/AppSync) and `CLOUDFRONT` — comment is correct.
- `default_action { allow {} }` and `block {}` blocks are valid syntax.
- Managed-rule rules correctly use `override_action { none {} }` (rather than `action {}`), and `managed_rule_group_statement` correctly takes `name` and `vendor_name = "AWS"`.
- Both `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet` are valid AWS-vendor managed rule group names.
- Custom geo rule correctly uses an `action {}` block (not `override_action`) since it is not a managed rule group.
- `geo_match_statement.country_codes` accepts ISO 3166-1 alpha-2 codes; `CN`, `RU`, `KP` are valid.
- Each rule and the top-level Web ACL include the required `visibility_config { cloudwatch_metrics_enabled, metric_name, sampled_requests_enabled }`.
- `aws_wafv2_web_acl_association` arguments `resource_arn` and `web_acl_arn` are correct.
- `aws_wafv2_web_acl_logging_configuration`: `log_destination_configs` accepts CloudWatch Log Group ARN; `logging_filter` structure with `default_behavior` (KEEP/DROP), `filter.behavior` (KEEP/DROP), `condition.action_condition.action` (ALLOW/BLOCK/COUNT/CAPTCHA/CHALLENGE/EXCLUDED_AS_COUNT), and `requirement` (MEETS_ALL/MEETS_ANY) all match the provider schema.
- CloudWatch log group name `aws-waf-logs-myapp` correctly satisfies the AWS-mandated `aws-waf-logs-` prefix for WAF logging destinations.

## Review Notes
- Minor inconsistency (not an error): the second rule's `metric_name` is `AWSManagedRulesKnownBadInputs`, while the rule itself is `AWSManagedRulesKnownBadInputsRuleSet`. Both are valid; this only affects the CloudWatch metric label.
- `AWSManagedRulesCommonRuleSet` is rate-limited (capacity-priced) and may match legitimate traffic; in production, users typically start with `count` action or `rule_action_override` for noisy sub-rules. The post does not need to cover this, but readers should be aware.
- Geo-blocking entire countries can have collateral impact (e.g., legitimate users via VPN/cloud regions). The post already prompts the reader to "Adjust for your risk profile," which is appropriate.
- Logging only `BLOCK` actions reduces volume but loses visibility into `COUNT`/`CAPTCHA`/`CHALLENGE` outcomes that are useful for tuning rules; an acceptable starting point as written.
