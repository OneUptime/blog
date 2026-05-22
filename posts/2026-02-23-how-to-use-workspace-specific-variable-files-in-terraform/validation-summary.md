# Validation Summary: How to Use Workspace-Specific Variable Files in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform input variables and `.tfvars` files
- Terraform `.auto.tfvars` automatic variable loading
- Bash wrapper scripts
- Makefile automation
- GitHub Actions CI/CD
- AWS provider resource examples

## Sources Consulted
- HashiCorp Terraform documentation: Workspaces, https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform CLI documentation: Manage Workspaces, https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform CLI documentation: `terraform workspace select`, https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform documentation: Input variables and variable definition files, https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform documentation: References to named values, https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform CLI documentation: `terraform plan`, https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI documentation: `terraform apply`, https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- Corrected the statement that Terraform silently ignores extra variables. Current Terraform documentation says undeclared variables in variable definition files produce warnings, while undeclared variables passed with `-var` produce errors.

## Review Notes
- Terraform CLI was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- The wrapper script examples are appropriate for direct `plan`, `apply`, and `destroy` style workflows. If adapting the wrapper for applying saved plan files, avoid adding planning options such as `-var-file` to `terraform apply <plan file>`, because saved plan mode does not allow additional planning options.
