# Validation Summary: How to Set Variable Default Values in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform CLI variable assignment
- Terraform variable validation
- AWS provider resource examples

## Sources Consulted
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform input variables guide: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform dynamic blocks reference: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform merge function reference: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform validation guide: https://developer.hashicorp.com/terraform/language/validate

## Issues Found
- Corrected the variable value precedence list. The original separated `-var` and `-var-file` as fixed priority levels and omitted JSON variable definition files. Terraform documents command-line `-var` and `-var-file` options as one precedence level evaluated in the order provided, and includes `*.auto.tfvars.json` and `terraform.tfvars.json` in automatic variable definition file precedence.

## Review Notes
- The post's variable defaults, collection defaults, object defaults, optional object attribute defaults, `null` default pattern, validation example, dynamic block usage, and `merge` example align with current Terraform documentation.
- Terraform CLI was not installed in the local environment, so command syntax and behavior were verified against official HashiCorp documentation rather than local CLI execution.
