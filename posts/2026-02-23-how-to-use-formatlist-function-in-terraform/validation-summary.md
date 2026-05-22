# Validation Summary: How to Use the formatlist Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions: `formatlist`, `format`, `join`, `keys`, `values`
- Terraform `for_each` and `toset`
- AWS provider resources for S3, IAM, security groups, and Route 53

## Sources Consulted
- HashiCorp Terraform `formatlist` function documentation: https://developer.hashicorp.com/terraform/language/functions/formatlist
- HashiCorp Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform `keys` function documentation: https://docs.hashicorp.com/terraform/language/functions/keys
- HashiCorp Terraform `values` function documentation: https://developer.hashicorp.com/terraform/language/functions/values
- HashiCorp AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The "Tag Generation" section said it generated tag maps, but the code returns a list of formatted tag values. Changed the wording to "tag values" to match the Terraform expression.
- The "formatlist with Count" section claimed to use `range` and generate 10 numbered names, but the code used a fixed three-item availability zone suffix list and did not use `range`. Updated the heading and description to match the actual example, removed the unused `subnet_types` local, and corrected the comment.

## Review Notes
The main `formatlist` behavior described in the post matches the official Terraform documentation: list arguments are processed by index, non-list arguments are reused for each iteration, and all list arguments must have the same length. The AWS security group example uses inline `ingress`, which is still supported, but the current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for current best practice.
