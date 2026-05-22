# Validation Summary: How to Use the alltrue Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform built-in functions
- Terraform variable validation
- Terraform collection expressions
- AWS provider resources and data sources

## Sources Consulted
- Terraform `alltrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform `anytrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/anytrue
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform CLI v1.14.0 console checks for `alltrue` edge cases.

## Issues Found
- The local-values example used `aws_instance.web[*].instance_state` to decide `count` for `aws_lb_target_group_attachment`. Terraform requires `count` to be known before remote resource operations, so a value derived from apply-time resource state can produce an invalid `count` expression. I changed the example to base `count` on plan-known input data in `var.target_instances`.
- The edge-case section said that passing `null` in the list causes `alltrue` to fail. Terraform CLI testing showed that `alltrue([true, null])` returns `false`, so I corrected the note.

## Review Notes
The post is technically sound after the corrections. Terraform was not installed in the workspace, so I downloaded Terraform CLI v1.14.0 to `/tmp` for console verification only.
