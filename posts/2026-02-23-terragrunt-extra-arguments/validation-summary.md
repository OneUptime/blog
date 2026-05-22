# Validation Summary: How to Use Terragrunt Extra Arguments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform CLI
- HCL configuration
- Terraform variable files
- Terraform CLI environment variables
- Terraform backend initialization

## Sources Consulted
- Terragrunt Extra Arguments documentation: https://docs.terragrunt.com/features/units/extra-arguments/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt CLI global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The debugging command used the older `--terragrunt-log-level` flag. Updated it to the current `--log-level debug` global flag from the Terragrunt CLI documentation.
- The root-level inheritance wording implied child modules inherit a root `terragrunt.hcl` automatically. Clarified that child modules need to include the root config.
- The practical example built `.tfvars` paths by appending `/../account.tfvars` and `/../region.tfvars` to paths returned by `find_in_parent_folders`, which return file paths. Updated those paths to use `dirname(find_in_parent_folders(...))` before appending the target `.tfvars` filenames.
- The backend partial configuration example used `path_relative_to_include()` without context. Clarified that the snippet applies to an included root config.
- The summary repeated the automatic root-default implication. Updated it to mention including the root config from child modules.

## Review Notes
Terragrunt's current documentation emphasizes OpenTofu/Terraform wording and the newer CLI redesign, but the Terraform-oriented examples remain technically valid because Terragrunt still forwards Terraform/OpenTofu shortcut commands and supports `extra_arguments`, `required_var_files`, `optional_var_files`, and `env_vars` as shown.
