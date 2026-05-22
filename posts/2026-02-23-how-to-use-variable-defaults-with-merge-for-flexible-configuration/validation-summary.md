# Validation Summary: How to Use Variable Defaults with merge for Flexible Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform local values
- Terraform functions: `merge`, `concat`, `lookup`, and `try`
- Terraform object type constraints and `optional()` attributes
- AWS provider resource examples

## Sources Consulted
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- OneUptime linked blog post URL: https://oneuptime.com/blog/post/2026-02-23-how-to-choose-between-variables-and-locals-in-terraform/view

## Issues Found
- The "Validation with Merged Values" section described its `optional()` example as validating a "merged" object, but that snippet does not use `merge()`. Updated the heading and surrounding wording to "Defaulted Values" and "defaulted object" because Terraform inserts defaults for optional object attributes before the module uses the value.

## Review Notes
- Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`.
- The nested object section correctly notes that `merge()` is shallow. The sample creates separate normalized nested locals, so downstream resource code should use those nested locals instead of relying on `local.alb_config.access_logs` to contain nested defaults.
