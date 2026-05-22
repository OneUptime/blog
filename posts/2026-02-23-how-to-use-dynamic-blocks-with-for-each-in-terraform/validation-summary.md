# Validation Summary: How to Use Dynamic Blocks with for_each in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform `for_each` meta-argument
- Terraform `dynamic` blocks
- Terraform expressions and functions (`for`, `flatten`, `toset`, `optional`)
- AWS Terraform provider resources (`aws_security_group`, `aws_budgets_budget`, `aws_cloudwatch_metric_alarm`, `aws_route`)

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform console command documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- Terraform AWS provider `aws_budgets_budget` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule

## Issues Found
- The flattening section said nested data could be deeper than "the dynamic block expects," but the example uses resource-level `for_each` with `aws_route`, not a `dynamic` block. Changed the wording to "a single `for_each` expects" so the explanation matches the code.

## Review Notes
The Terraform language examples are consistent with official documentation: resource-level `for_each` creates resource instances from maps or sets, while `dynamic` blocks generate repeatable nested blocks from collection or structural values and expose iterator `.key` and `.value` attributes. The AWS provider still supports inline `ingress` and `egress` blocks on `aws_security_group`, but the current provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the best practice for production security group rules. The inline rule examples remain technically valid for demonstrating dynamic nested blocks.
