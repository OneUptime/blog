# Validation Summary: How to Use the abs Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- Terraform numeric expressions
- Terraform variable validation

## Sources Consulted
- HashiCorp Terraform `abs` function documentation: https://developer.hashicorp.com/terraform/language/functions/abs
- HashiCorp Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- HashiCorp Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- HashiCorp Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- HashiCorp Terraform input variables and validation documentation: https://developer.hashicorp.com/terraform/language/values/variables
- OneUptime linked ceil function post: https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-ceil-function-in-terraform/view
- OneUptime linked floor function post: https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-floor-function-in-terraform/view

## Issues Found
- The subnet CIDR example said the `newbits` calculation worked regardless of which prefix was larger. In Terraform CIDR terminology, `newbits` is meaningful when the subnet prefix is larger than the parent VPC prefix, so the comment and expression were corrected to use `var.subnet_cidr_prefix - var.vpc_cidr_prefix`.
- The time zone maintenance-window expression could produce a negative hour for positive UTC offsets because `%` returns a remainder. Added `+ 24` before applying `% 24` so ordinary UTC offsets normalize into the 0-23 hour range.
- The post said Terraform has no `sum` function. Current Terraform documentation includes `sum`, so the example now uses `sum([for v in local.values : abs(v)])` and adds the matching output.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed statically against official HashiCorp documentation rather than executed with `terraform validate` or `terraform console`.
