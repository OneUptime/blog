# Validation Summary: How to Use the compact Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform collection functions
- AWS provider resources for security groups, ACM certificates, and Lambda functions

## Sources Consulted
- HashiCorp Terraform `compact` function documentation: https://developer.hashicorp.com/terraform/language/functions/compact
- HashiCorp Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- HashiCorp Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- HashiCorp Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- HashiCorp Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- HashiCorp Terraform type constraints and automatic conversion documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- HashiCorp AWS provider `aws_acm_certificate` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate

## Issues Found
- The post incorrectly stated that Terraform's `compact` function does not remove null values. Current official HashiCorp documentation states that `compact` returns a list with null and empty string elements removed. Updated the overview, behavior description, edge cases, and summary to say that `compact` removes both `""` and `null`.
- Added small Terraform console examples showing that null values are removed, so the examples now match the documented behavior.
- The post stated that passing numbers or booleans to `compact` would cause a type error. Terraform can automatically convert primitive number and boolean values to strings when needed, so this was narrowed to values that cannot be converted to strings.

## Review Notes
Terraform CLI is not installed in this workspace, so examples were reviewed against official HashiCorp documentation rather than executed locally. The AWS resource snippets use currently documented arguments. The `aws_security_group_rule` resource remains documented, though AWS provider documentation now recommends newer VPC security group rule resources as the best practice for security group rule management.
