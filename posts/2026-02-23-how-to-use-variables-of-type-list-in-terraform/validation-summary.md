# Validation Summary: How to Use Variables of Type List in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform input variables and type constraints
- Terraform collection functions and for expressions
- Terraform `count`, `for_each`, and dynamic blocks
- AWS provider resources: `aws_subnet`, `aws_security_group`, and `aws_s3_bucket`

## Sources Consulted
- Terraform Types and Values: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform Input Variables: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `count` and `for_each` meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform `for_each` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform Dynamic Blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform For Expressions: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform collection and conversion functions: https://developer.hashicorp.com/terraform/language/functions
- Terraform `concat`, `contains`, `flatten`, `index`, `sort`, `toset`, and `cidrsubnet` function references: https://developer.hashicorp.com/terraform/language/functions/concat, https://developer.hashicorp.com/terraform/language/functions/contains, https://developer.hashicorp.com/terraform/language/functions/flatten, https://developer.hashicorp.com/terraform/language/functions/index_function, https://developer.hashicorp.com/terraform/language/functions/sort, https://developer.hashicorp.com/terraform/language/functions/toset, https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_s3_bucket` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The `for_each` section originally stated that adding or removing an AZ from the middle of the list would not cause subsequent resources to be destroyed and recreated. This was only partially correct for the shown example because the `cidr_block` expression still derives subnet numbering from the original list index, so a list-order change can still change arguments and force replacement. Updated the wording to distinguish stable resource addresses from position-derived argument changes.

## Review Notes
- Terraform CLI is not installed in the local environment, so validation was performed against official Terraform and AWS provider documentation rather than by running `terraform validate`.
- The inline `aws_security_group` rule example is valid, but the current AWS provider documentation recommends using `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for newer configurations, especially when managing individual rule identity, tags, descriptions, or multiple CIDR blocks.
