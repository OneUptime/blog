# Validation Summary: How to Choose the Right Terraform Function for Your Use Case

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- Terraform expressions

## Sources Consulted
- Terraform built-in functions overview: https://developer.hashicorp.com/terraform/language/functions
- Terraform function calls and expansion syntax: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform for expressions and grouping mode: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform replace function: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform regex function: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform zipmap function: https://developer.hashicorp.com/terraform/language/functions/zipmap
- Terraform max function: https://developer.hashicorp.com/terraform/language/functions/max
- Terraform urlencode function: https://developer.hashicorp.com/terraform/language/functions/urlencode
- Terraform cidrnetmask function: https://developer.hashicorp.com/terraform/language/functions/cidrnetmask
- Terraform filesystem functions: https://developer.hashicorp.com/terraform/language/functions

## Issues Found
- The introduction framed `zipmap` as an option for combining maps. Terraform's `zipmap` constructs a map from corresponding key and value lists, while `merge` combines maps. Changed the wording to "building maps" so the comparison is technically accurate.
- The string replacement section described pattern replacement as `regex` + `replace`. Terraform's `replace` function itself supports regex matching when the substring argument is wrapped in forward slashes. Changed the wording to "replace with a regex pattern" to match Terraform's documented behavior.

## Review Notes
Terraform CLI was not installed in the review environment, so examples were checked against official Terraform documentation rather than executed with `terraform console`. The code examples use current Terraform language functions and no deprecated APIs were identified.
