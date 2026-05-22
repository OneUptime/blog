# Validation Summary: How to Use the endswith Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform variable validation
- Terraform for expressions and for_each
- AWS provider resources used as examples

## Sources Consulted
- HashiCorp Terraform `endswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/endswith
- HashiCorp Terraform v1.3.x `endswith` function documentation: https://developer.hashicorp.com/terraform/language/v1.3.x/functions/endswith
- HashiCorp Terraform v1.4.x `endswith` function documentation: https://developer.hashicorp.com/terraform/language/v1.4.x/functions/endswith
- HashiCorp Terraform `startswith` function documentation: https://developer.hashicorp.com/terraform/language/functions/startswith
- HashiCorp Terraform `lower` function documentation: https://developer.hashicorp.com/terraform/language/functions/lower
- HashiCorp Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate

## Issues Found
- The post stated that `endswith` was introduced in Terraform 1.5. HashiCorp's archived documentation shows the function is present in Terraform v1.3.x and v1.4.x, so I changed the minimum version note to Terraform 1.3.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform console` or `terraform validate` locally. The snippets were reviewed against the official Terraform documentation and appear syntactically consistent with Terraform expression, validation, and resource patterns.
