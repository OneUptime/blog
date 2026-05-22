# Validation Summary: How to Use the startswith Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform variable validation
- Terraform for expressions
- AWS provider resources

## Sources Consulted
- Terraform `startswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/startswith
- Terraform v1.3 `startswith` function documentation: https://developer.hashicorp.com/terraform/language/v1.3.x/functions/startswith
- Terraform `endswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/endswith
- Terraform `strcontains` function documentation: https://developer.hashicorp.com/terraform/language/functions/strcontains
- Terraform `lower` function documentation: https://developer.hashicorp.com/terraform/language/functions/lower
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform input variables and validation documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform v1.3 changelog: https://github.com/hashicorp/terraform/blob/v1.3/CHANGELOG.md
- Terraform v1.5 changelog: https://github.com/hashicorp/terraform/blob/v1.5/CHANGELOG.md

## Issues Found
- The post incorrectly stated that `startswith` was introduced in Terraform 1.5 alongside `endswith` and `strcontains`. Official Terraform v1.3 documentation and changelog show `startswith` and `endswith` were added in Terraform 1.3, while the Terraform v1.5 changelog shows `strcontains` was added in Terraform 1.5. Updated the introduction to reflect the correct versions.

## Review Notes
The Terraform CLI is not installed in the local environment, so examples were reviewed statically against official Terraform documentation. The HCL snippets use valid Terraform expression syntax and current function names. The AWS examples omit surrounding provider, data source, and hosted zone definitions, but are appropriate as focused examples of prefix-based filtering and conditional logic.
