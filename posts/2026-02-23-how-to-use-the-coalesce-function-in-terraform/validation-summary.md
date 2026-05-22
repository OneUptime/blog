# Validation Summary: How to Use the coalesce Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform built-in functions: `coalesce`, `coalescelist`, `lookup`, and `merge`
- Terraform local values, variables, optional object attributes, and conditional expressions
- AWS provider resource examples: EC2 instances, CloudWatch log groups, RDS DB instances, and VPCs

## Sources Consulted
- HashiCorp Terraform `coalesce` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- HashiCorp Terraform `coalescelist` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalescelist
- HashiCorp Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- HashiCorp Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- HashiCorp Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_cloudwatch_log_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- HashiCorp AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The post categorized `coalesce` as a type conversion function. HashiCorp documents `coalesce` under collection functions, so the tag was changed from `Type Conversion Functions` to `Collection Functions`.
- The `coalesce vs Conditional Expressions` examples used direct assignments such as `local.name = ...` and `local.port = ...`, which are not valid Terraform configuration syntax. These were changed to declare `name` and `port` inside `locals` blocks.
- The displayed error text for `coalesce(null, "", null)` did not match Terraform's current error wording. It was updated to `no non-null, non-empty-string arguments`.

## Review Notes
The core behavior described in the post is correct: `coalesce` returns the first argument that is not `null` and not an empty string, Terraform requires compatible argument types and may perform automatic type conversion, and `coalescelist` is the appropriate list-specific equivalent for selecting the first non-empty list. Terraform CLI was not installed in the local environment, so verification was performed against official HashiCorp documentation rather than local `terraform console` execution.
