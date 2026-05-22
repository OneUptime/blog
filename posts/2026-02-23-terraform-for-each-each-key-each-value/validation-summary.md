# Validation Summary: How to Use each.key and each.value in Terraform for_each

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform `for_each` meta-argument
- Terraform `each.key` and `each.value`
- Terraform modules
- AWS Terraform provider resources

## Sources Consulted
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform references to values documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_iam_user_group_membership` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_group_membership

## Issues Found
- The post described `for_each` as accepting a "map or set" in several places. Terraform's official `for_each` reference specifies that resource and module `for_each` accepts a map or a set of strings. Updated the introduction and set/list sections to say "set of strings" and "list of strings" where appropriate.

## Review Notes
- The remaining examples and explanations are consistent with the official Terraform documentation for `each.key`, `each.value`, map/object iteration, module instance references, and plan-time key requirements.
- Dynamic blocks use their own iterator object by default, but the post's example uses normal nested resource arguments and does not demonstrate a separate dynamic block iterator.
