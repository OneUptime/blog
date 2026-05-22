# Validation Summary: How to Use the can Function in Terraform for Error Handling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- Terraform variable validation

## Sources Consulted
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- Terraform `index` function documentation: https://developer.hashicorp.com/terraform/language/functions/index_function
- Terraform input variable validation documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform CLI v1.15.4 console checks for selected expressions

## Issues Found
- The post stated that `can` never raises an error. Updated this to clarify that `can` catches dynamic evaluation errors, but cannot catch errors Terraform can prove invalid before evaluation, such as malformed references or undeclared top-level objects.
- The post described `can` as broadly useful outside validation without mentioning HashiCorp's recommendation to use it mainly in variable validation and prefer `try` for fallback values elsewhere. Updated the wording to include that caveat.
- The `is_map` example used `can(length(var.flexible_input)) && !can(tolist(var.flexible_input))`, which also returns true for strings. Replaced it with `can(tomap(var.flexible_input))`.

## Review Notes
Terraform was not installed in the repository environment, so Terraform CLI v1.15.4 was downloaded from HashiCorp releases into `/tmp/terraform-bin` and used for console checks. No local project validation was run because the post contains illustrative snippets rather than a standalone Terraform module.
