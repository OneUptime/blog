# Validation Summary: How to Create AWS WAF Web ACLs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS provider for OpenTofu / Terraform
- AWS WAF v2
- AWS WAF Web ACLs
- Amazon CloudFront

## Sources Consulted
- AWS WAF API Reference, `ByteMatchStatement`: https://docs.aws.amazon.com/waf/latest/APIReference/API_ByteMatchStatement.html
- AWS WAF Developer Guide, rate limit requests missing a specific header: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rate-based-example-limit-missing-header.html
- AWS WAF Developer Guide, setting rule priority: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-processing-order.html
- AWS WAF Developer Guide, rule and rule group actions: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rule-actions.html
- AWS WAF Developer Guide, size constraint rule statement: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-size-constraint-match.html
- AWS CLI Command Reference, `wafv2 associate-web-acl`: https://docs.aws.amazon.com/cli/latest/reference/wafv2/associate-web-acl.html
- Terraform Registry, `aws_wafv2_ip_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_ip_set
- Terraform Registry, `aws_wafv2_regex_pattern_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_regex_pattern_set
- OpenTofu docs, `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The API-key rule used `byte_match_statement` with `positional_constraint = "EXISTS"`, which is not a valid AWS WAF byte-match positional constraint. I replaced it with a `size_constraint_statement` on the `x-api-key` header so the example correctly blocks requests where the header is missing or empty.
- The Step 4 heading said the snippet associated the Web ACL with CloudFront, but the snippet only created a CloudFront-scope Web ACL. AWS documents that CloudFront associations are done through the distribution configuration rather than `wafv2 associate-web-acl`, so I renamed the step and tightened the comment to match what the code actually does.
- The Step 3 heading implied the snippet performed request content validation, but the code only created a reusable regex pattern set. I renamed the heading to accurately describe the resource being defined.
- The post description claimed coverage of bot management rules, but the post does not include bot-management configuration. I removed that claim from the description.

## Review Notes
- The remaining WAF examples are technically consistent with current AWS WAF behavior: rule priorities are evaluated from the lowest numeric priority upward, and `allow` / `block` are terminating actions while `count` is non-terminating.
- The snippets are partial examples rather than a full deployable OpenTofu stack. They still assume surrounding provider configuration, variables such as `var.project_name`, and an aliased `aws.us_east_1` provider for the CloudFront example.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `terraform` was not possible in this workspace because neither CLI is installed, and no live AWS account was available for deployment tests.
