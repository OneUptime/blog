# Validation Summary: How to Use the inputs Block in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform
- HCL
- Infrastructure as Code
- CLI debugging workflows

## Sources Consulted
- Terragrunt HCL attributes documentation: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt `render` command documentation: https://docs.terragrunt.com/reference/cli/commands/render/
- Terragrunt debugging documentation: https://docs.terragrunt.com/troubleshooting/debugging/
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform CLI environment variables documentation: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The post said Terragrunt converts `inputs` to `TF_VAR_*` environment variables without noting JSON encoding. Updated the explanation to match Terragrunt's documented JSON-encoded environment variable behavior.
- The debugging section used `terragrunt render-json`, which has been superseded in current Terragrunt documentation by `terragrunt render --format json`. Updated the command.
- The post suggested `terragrunt apply 2>&1 | grep TF_VAR` to inspect inputs, but Terraform/Terragrunt do not normally print all `TF_VAR_*` values during apply. Replaced this with the documented `terragrunt run --log-level debug --inputs-debug -- plan` workflow, which writes `terragrunt-debug.tfvars.json`.
- The post said unused inputs cause Terraform warnings. Because Terragrunt passes inputs through environment variables, Terraform ignores undeclared `TF_VAR_*` environment variables. Updated the warning to explain that unused or misspelled keys can be silently ignored.

## Review Notes
The examples for `inputs`, `include` merge strategies, `locals`, `dependency` outputs, `get_env`, file decoding, and conditional expressions are consistent with current Terragrunt and Terraform documentation. The post uses Terraform terminology, while current Terragrunt documentation increasingly refers to OpenTofu/Terraform; this is acceptable for a Terraform-focused article.
