# Validation Summary: How to Parse and Format Strings in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform built-in string functions
- Regular expressions in Terraform
- Infrastructure as Code naming patterns

## Sources Consulted
- HashiCorp Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform `split` function documentation: https://developer.hashicorp.com/terraform/language/functions/split
- HashiCorp Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- HashiCorp Terraform `replace` function documentation: https://docs.hashicorp.com/terraform/language/functions/replace
- HashiCorp Terraform `regex` function documentation: https://docs.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- HashiCorp Terraform `substr` function documentation: https://developer.hashicorp.com/terraform/language/functions/substr
- HashiCorp Terraform `trim` function documentation: https://developer.hashicorp.com/terraform/language/functions/trim
- HashiCorp Terraform `startswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/startswith
- HashiCorp Terraform `title` function documentation: https://developer.hashicorp.com/terraform/language/functions/title

## Issues Found
- The dynamic resource name sanitizer removed all non-alphanumeric characters before replacing whitespace with hyphens, so spaces were deleted before the whitespace replacement could run. I changed the expression to replace whitespace with hyphens first, then remove unsupported characters while preserving hyphens. This keeps the example aligned with the intended hyphenated resource naming pattern.

## Review Notes
The remaining examples match Terraform's documented function signatures and return behavior. Terraform CLI was not installed in the local environment, so examples were verified against official HashiCorp documentation rather than by running `terraform console`.
