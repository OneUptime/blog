# Validation Summary: How to Use Dynamic Blocks for WAF Rules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform dynamic blocks
- Terraform AWS provider
- AWS WAFv2 rule groups
- AWS WAFv2 web ACLs
- AWS managed rule groups
- AWS WAF IP sets

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform AWS provider `aws_wafv2_rule_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_rule_group
- Terraform AWS provider `aws_wafv2_web_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS provider `aws_wafv2_ip_set` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_ip_set
- AWS WAF rule statements documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statements-list.html
- AWS WAF AWS Managed Rules baseline rule groups documentation: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- AWS WAF web ACL capacity units documentation: https://docs.aws.amazon.com/waf/latest/developerguide/aws-waf-capacity-units.html

## Issues Found
- The compound statement section claimed to show AND/OR logic, but the code only implemented AND logic. Changed the section heading and introductory sentence to accurately describe AND statements.
- The `compound_rules` type advertised a `byte_match` condition and fields for `search_string` and `field`, but the dynamic block did not generate a `byte_match_statement`. Removed those unsupported fields from the example so the input type matches the generated Terraform.
- The compound statement example handled a single `geo` condition directly but not a single `ip_set` condition, which could produce an empty `statement` block for valid-looking input. Added a direct `ip_set_reference_statement` dynamic block for single IP-set conditions.
- The managed rule group section referred to the AWS managed common rule group as the "OWASP Core Rule Set." AWS documents it as the AWS Core Rule Set (CRS), with protections related to OWASP publications. Updated the wording.
- The capacity tip said WAF capacity limits are per rule group. AWS WAF uses WCUs for rules, rule groups, and web ACLs. Updated the tip to avoid implying capacity only applies at the rule group level.

## Review Notes
Validated the combined Terraform snippets with Terraform v1.15.4 in Docker using hashicorp/aws provider v6.46.0; `terraform validate` reported the configuration is valid. The current AWS provider documentation notes known limitations with inline `rule` blocks on `aws_wafv2_web_acl`; the post's inline examples remain valid, but future production guidance could mention separate `aws_wafv2_web_acl_rule` resources for larger Web ACL rule sets.
