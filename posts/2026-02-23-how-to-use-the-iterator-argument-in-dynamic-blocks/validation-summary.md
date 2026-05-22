# Validation Summary: How to Use the Iterator Argument in Dynamic Blocks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform dynamic blocks
- AWS provider WAFv2 resources

## Sources Consulted
- HashiCorp Terraform documentation: Dynamic Blocks - https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp AWS Provider documentation source: aws_wafv2_web_acl - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- HashiCorp AWS Provider documentation source: aws_wafv2_rule_group - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_rule_group.html.markdown
- OneUptime referenced article link - https://oneuptime.com/blog/post/2026-02-23-how-to-use-nested-dynamic-blocks-in-terraform/view

## Issues Found
- The nested dynamic block example described the inner block's `for_each = statement.value.sub_rules` reference as ambiguous. Terraform evaluates that expression in a scope where the outer iterator is still the relevant `statement`; the shadowing problem occurs inside the inner `content` block. Updated the comment to clarify this.
- The post described custom iterators as necessary in all listed situations and recommended always using them for nested blocks. Official Terraform documentation specifically calls out custom iterator symbols when nested blocks have the same type name as a parent, while other uses are readability improvements. Updated the heading and best practice wording to avoid overstating the requirement.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official Terraform and AWS provider documentation rather than validated with `terraform validate`. The WAFv2 example uses inline `rule` blocks, which the current AWS provider documentation notes have limitations; separate `aws_wafv2_web_acl_rule` resources may be preferable for production Web ACL rule management.
