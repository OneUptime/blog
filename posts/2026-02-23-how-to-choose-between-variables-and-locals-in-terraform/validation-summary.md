# Validation Summary: How to Choose Between Variables and Locals in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform local values
- Terraform variable validation

## Sources Consulted
- HashiCorp Terraform documentation: Manage values in modules - https://developer.hashicorp.com/terraform/language/values
- HashiCorp Terraform documentation: Use input variables to add module arguments - https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform documentation: Variable block reference - https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform documentation: Locals block reference - https://developer.hashicorp.com/terraform/language/block/locals
- HashiCorp Terraform documentation: Expressions - https://developer.hashicorp.com/terraform/language/expressions
- HashiCorp Terraform documentation: coalesce function - https://developer.hashicorp.com/terraform/language/functions/coalesce

## Issues Found
- The post said that bad input "has to be a variable." Variables are the correct place to validate caller-provided input, but the original wording was broader than necessary. Changed it to "bad caller input" to make the scope accurate.
- The decision flowchart recommended "a variable with a computed default." Terraform variable defaults must be literal values and cannot reference other configuration objects. Changed this to recommend a variable with a `null` default plus a local that computes the final value, matching the pattern shown later in the post.

## Review Notes
The HCL examples use current Terraform syntax for variable blocks, locals blocks, validation blocks, for expressions, conditional expressions, object type constraints, and `coalesce`. The internal OneUptime link target exists in the repository.
