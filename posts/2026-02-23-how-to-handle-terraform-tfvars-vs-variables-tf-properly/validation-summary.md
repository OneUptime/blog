# Validation Summary: How to Handle terraform.tfvars vs variables.tf Properly

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform variable definition files
- Terraform CLI variable flags

## Sources Consulted
- HashiCorp Developer: Use input variables to add module arguments - https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Developer: variable block reference - https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Developer: Type constraints - https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Developer: terraform plan command reference - https://developer.hashicorp.com/terraform/cli/commands/plan

## Issues Found
- Corrected the opening claim that every Terraform project has both `variables.tf` and `terraform.tfvars`. Terraform projects can omit either file if they do not need those declarations or value files, so the post now says many projects use them.
- Corrected the variable type list. Terraform type constraints also include `set`, `tuple`, and `any`, not only `string`, `number`, `bool`, `list`, `map`, and `object`.
- Corrected Terraform variable precedence. The post incorrectly listed `TF_VAR_` environment variables as the highest-precedence source. Terraform gives command-line `-var` and `-var-file` options the highest precedence, processes those CLI options in the order provided, and treats environment variables as lower precedence than automatically loaded variable definition files.
- Updated the variable precedence example so it no longer states that `-var` is overridden by environment variables.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed against the official HashiCorp documentation and are illustrative rather than a complete standalone Terraform configuration.
