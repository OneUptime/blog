# Validation Summary: How to Use the hashicorp/setup-terraform GitHub Action

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- hashicorp/setup-terraform GitHub Action
- GitHub Actions workflow syntax
- HCP Terraform / Terraform Enterprise credentials
- Terraform provider plugin cache
- actions/cache
- actions/github-script

## Sources Consulted
- hashicorp/setup-terraform official README: https://github.com/hashicorp/setup-terraform
- Terraform CLI configuration file documentation, provider plugin cache: https://developer.hashicorp.com/terraform/cli/config/config-file#provider-plugin-cache
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- HashiCorp Terraform GitHub Actions tutorial: https://developer.hashicorp.com/terraform/tutorials/automation/github-actions
- Terraform GitHub releases: https://github.com/hashicorp/terraform/releases

## Issues Found
- Updated all `hashicorp/setup-terraform@v3` examples to `hashicorp/setup-terraform@v4`, matching the current official setup-terraform README examples.
- Added a `mkdir -p ~/.terraform.d/plugin-cache` step before `terraform init` in the provider caching example. Terraform's plugin cache directory must already exist; Terraform does not create it automatically.

## Review Notes
- The wrapper output names (`stdout`, `stderr`, `exitcode`), Terraform Cloud credential inputs, version constraint input, and `terraform_wrapper: false` usage match the official action documentation.
- The `terraform plan` flags (`-no-color`, `-input=false`) and `terraform output -json | jq` usage are valid according to Terraform CLI documentation.
- The pinned Terraform version examples are syntactically valid, though teams should periodically update them to a currently supported Terraform release.
