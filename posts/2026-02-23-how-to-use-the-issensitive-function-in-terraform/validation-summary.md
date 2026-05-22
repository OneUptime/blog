# Validation Summary: How to Use the issensitive Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform sensitive values
- AWS Systems Manager Parameter Store via the Terraform AWS provider

## Sources Consulted
- Terraform `issensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/issensitive
- Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter

## Issues Found
- The post did not mention that `issensitive` is only available in Terraform v1.8 and later. Added a short note after the function description.
- The conditional tag masking example used `nonsensitive(value)` in the non-sensitive branch. Terraform's `nonsensitive` function is intended for sensitive values and errors when called with a value that is not marked sensitive, so the example could fail for non-sensitive metadata values. Changed the non-sensitive branch to return `value` directly.

## Review Notes
The examples are conceptually correct for Terraform v1.8 and later. Sensitive values are still stored in Terraform state unless newer ephemeral/write-only patterns are used where supported, so future posts could call out state exposure more explicitly when discussing secrets.
