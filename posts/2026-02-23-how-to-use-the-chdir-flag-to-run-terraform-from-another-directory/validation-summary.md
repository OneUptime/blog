# Validation Summary: How to Use the -chdir Flag to Run Terraform from Another Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform `-chdir` global option
- Terraform variable files
- Terraform working directories, state, dependency lock files, and data directories
- Bash scripting
- Makefiles
- GitHub Actions CI/CD

## Sources Consulted
- Terraform CLI overview, including `-chdir`: https://developer.hashicorp.com/terraform/cli/commands
- Terraform CLI environment variables, including `TF_CLI_ARGS` insertion order: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform plan command reference, including legacy directory argument deprecation and `-chdir`: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform init / working directory contents: https://developer.hashicorp.com/terraform/cli/init
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state

## Issues Found
- The `-var-file` example first marked `../../shared/common.tfvars` as non-working and then corrected itself. Terraform resolves that relative path from the `-chdir` directory, so the example was edited to state directly that it works.
- The section on `TF_CLI_ARGS` incorrectly said it can set a default `-chdir` path. Terraform inserts `TF_CLI_ARGS` after the subcommand, while `-chdir` must be placed before the subcommand as a global option. The section was corrected to explain that `TF_CLI_ARGS` is not a reliable way to set `-chdir`, and the recommendation to use explicit `-chdir` arguments in scripts was preserved.

## Review Notes
Terraform was not installed in the local environment, so command behavior was validated against current official HashiCorp documentation rather than local `terraform --help` output. The post's core guidance is accurate after the fixes: `-chdir` must precede the subcommand, normal working-directory files are read and written under the target directory, and local state, `.terraform`, and `.terraform.lock.hcl` behavior follows Terraform's working-directory model.
