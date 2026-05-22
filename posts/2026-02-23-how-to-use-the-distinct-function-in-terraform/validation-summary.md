# Validation Summary: How to Use the distinct Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform collection functions (`distinct`, `concat`, `compact`, `toset`)
- Terraform for expressions, dynamic blocks, and variable validation
- AWS Terraform provider resources for VPCs, security groups, and Route53 records

## Sources Consulted
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `compact` function documentation: https://developer.hashicorp.com/terraform/language/functions/compact
- Terraform `toset` function documentation: https://developer.hashicorp.com/terraform/language/functions/toset
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform type constraints and conversion documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The merged-region example said it would create a VPC in each unique region. A single `aws_vpc` resource loop uses the configured AWS provider region; actual multi-region provisioning requires provider aliases. Changed the comment to say it creates a VPC entry for each unique region value.
- The Route53 example said a duplicate endpoint would cause a Terraform error when using `for_each` with `toset`. Terraform sets cannot contain duplicates, and `toset` coalesces duplicate list elements. Reworded this to explain that `distinct` keeps an ordered deduplicated list before conversion to a set.
- The edge-case section said mixing strings and numbers will cause an error. Terraform can convert mixed primitive values to a common type in some contexts, while incompatible mixed values fail. Updated the wording to reflect Terraform's documented type conversion behavior.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were checked against official Terraform and Terraform AWS provider documentation rather than executed locally.
