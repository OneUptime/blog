# Validation Summary: How to Use Dynamic Blocks for Security Group Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform input variable type constraints
- AWS provider for Terraform
- AWS security groups
- Infrastructure as Code

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- OneUptime linked Terraform post: https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-with-for-each-in-terraform/view

## Issues Found
- The reusable module set the security group `description` variable default to an empty string. The current AWS provider documentation states that `aws_security_group.description` cannot be `""`, so the default was changed to `"Managed by Terraform"`.
- The post presented inline `ingress` and `egress` rules without mentioning the current AWS provider recommendation to use standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production rule management. A caveat was added explaining that the inline-rule examples remain valid for demonstrating dynamic blocks, but should not be mixed with standalone security group rule resources for the same security group.

## Review Notes
The Terraform dynamic block syntax, iterator usage, object type constraints, optional object attributes, `concat`, `lookup`, map filtering with `for` expressions, and AWS security group rule arguments shown in the post are consistent with the consulted documentation. Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
