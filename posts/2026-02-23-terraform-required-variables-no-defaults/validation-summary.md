# Validation Summary: How to Make Variables Required Without Defaults in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables
- HCL variable blocks and validation
- Terraform CLI variable assignment
- terraform-docs generated documentation
- AWS region and account ID examples

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform custom validation documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- terraform-docs markdown reference: https://terraform-docs.io/reference/markdown/
- AWS Regions documentation: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html

## Issues Found
- The AWS region validation example used a broad regex and described it as validating a valid AWS region. That pattern excluded valid AWS Regions such as GovCloud and several newer commercial Regions, while also allowing invalid region-like strings. I changed the example to use `contains()` with an explicit supported deployment region allowlist and updated the error message accordingly.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` against extracted snippets. The HCL syntax and CLI examples were reviewed against current official documentation instead.
