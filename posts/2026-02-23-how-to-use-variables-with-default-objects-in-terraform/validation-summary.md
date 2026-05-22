# Validation Summary: How to Use Variables with Default Objects in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform object type constraints
- Terraform optional object attributes
- Terraform functions: `merge()` and `coalesce()`
- Terraform variable validation

## Sources Consulted
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform `merge` function: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform functions reference, including `coalesce`: https://developer.hashicorp.com/terraform/language/functions
- Terraform input variables and validation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform custom conditions and validation requirements: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp Terraform 1.3 release blog covering optional object attributes with defaults: https://www.hashicorp.com/en/blog/terraform-1-3-improves-extensibility-and-maintainability-of-terraform-modules

## Issues Found
- The note explaining the boolean ternary claimed that `coalesce()` considers `false` to be empty. Terraform's `coalesce()` returns the first argument that is not `null` or an empty string; `false` is not treated as empty. Updated the note to say the ternary makes the null check explicit for booleans and that `coalesce()` skips `null` and empty strings, not `false`.

## Review Notes
The Terraform CLI is not installed in this workspace, so snippets were reviewed against official Terraform documentation rather than validated with `terraform validate`. The post's Terraform 1.3 caveat is correct for the generally available optional object attribute defaults feature; older optional-attribute behavior existed experimentally before Terraform 1.3.
