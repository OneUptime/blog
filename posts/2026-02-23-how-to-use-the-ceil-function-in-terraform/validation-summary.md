# Validation Summary: How to Use the ceil Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform built-in numeric functions
- AWS provider resources for illustrative examples

## Sources Consulted
- HashiCorp Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- HashiCorp Terraform `floor` function documentation: https://developer.hashicorp.com/terraform/language/functions/floor
- HashiCorp Terraform `log` function documentation: https://developer.hashicorp.com/terraform/language/functions/log
- HashiCorp Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- HashiCorp Terraform `max` function documentation: https://developer.hashicorp.com/terraform/language/functions/max
- HashiCorp Terraform built-in functions overview and `terraform console` usage: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume

## Issues Found
- The "ceil vs floor vs round" section could be read as implying Terraform has a built-in `round` function. Terraform's documented numeric functions include `ceil` and `floor`, but not `round`. Updated the heading and surrounding text to describe "nearest-value rounding" as a pattern, and clarified that the `floor(value + 0.5)` workaround is appropriate for non-negative numbers.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against the current official HashiCorp Terraform documentation rather than by running `terraform console`. The AWS snippets are illustrative and omit surrounding provider, variable, and launch template definitions, but the referenced resource arguments are consistent with the AWS provider documentation.
