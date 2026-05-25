# Validation Summary: How to Chain Collection Functions in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform collection functions
- AWS provider `aws_lb_target_group_attachment`

## Sources Consulted
- Terraform function calls documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- Terraform `sort` function documentation: https://developer.hashicorp.com/terraform/language/functions/sort
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `values` function documentation: https://developer.hashicorp.com/terraform/language/functions/values
- Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform `toset` function documentation: https://developer.hashicorp.com/terraform/language/functions/toset
- Terraform `setunion` function documentation: https://developer.hashicorp.com/terraform/language/functions/setunion
- Terraform `setintersection` function documentation: https://developer.hashicorp.com/terraform/language/functions/setintersection
- Terraform `setsubtract` function documentation: https://developer.hashicorp.com/terraform/language/functions/setsubtract
- Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- AWS provider `aws_lb_target_group_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment

## Issues Found
- Updated two result comments that showed set values as if their ordering were stable. Terraform sets are unordered, so the comments now describe the resulting membership instead of implying order.
- Corrected the `web_instance_names` chain comment from `values -> for` to `for`, because the expression iterates directly over `var.instances`.
- Corrected the `final_tags` chain comment from `transform keys` to `copy entries`, because the for expression does not transform the keys.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` or `terraform console`. The examples were reviewed against the official Terraform language function documentation and the AWS provider resource documentation.
