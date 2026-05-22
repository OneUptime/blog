# Validation Summary: How to Use Terragrunt Hooks (before_hook and after_hook)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform
- HCL
- TFLint
- Infracost
- Shell scripting
- Slack webhooks
- Terratest

## Sources Consulted
- Terragrunt hooks documentation: https://docs.terragrunt.com/features/units/hooks/
- Terragrunt HCL terraform block reference: https://docs.terragrunt.com/reference/hcl/blocks/#terraform
- Terragrunt CLI global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt OpenTofu/Terraform shortcut commands reference: https://docs.terragrunt.com/reference/cli/commands/opentofu-shortcuts/
- Terraform fmt command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- TFLint CLI documentation: https://github.com/terraform-linters/tflint
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost Terragrunt documentation: https://www.infracost.io/docs/features/terragrunt/

## Issues Found
- The post referred to the special hook command as `terragrunt-read-config` and used it in a `before_hook`. Terragrunt documents this command as `read-config`, and it is supported only with `after_hook`. Updated the text and example accordingly.
- The post described hook working directories as the "Terragrunt working directory" where downloaded source lives. Updated this to the documented behavior: normal hooks run where Terraform runs, and sourced modules usually run from `.terragrunt-cache`.
- The hook failure section said the default before_hook failure behavior could be changed, then later said there is no built-in continue-on-failure flag. Removed the contradiction and clarified that non-blocking checks must exit successfully.
- The Infracost example used `terraform show -json tfplan` in a `before_hook` for `apply`, but no saved `tfplan` file is created by that hook. Replaced it with `infracost breakdown --path .`, which is a documented way to estimate costs from the current project directory.
- The debugging example used the legacy `--terragrunt-log-level` flag. Updated it to the current documented global flag, `--log-level`.

## Review Notes
Terragrunt now documents OpenTofu and Terraform support together, and many examples refer to `tofu` as well as `terraform`. The post remains Terraform-focused, which is still technically valid because Terragrunt supports Terraform shortcut commands.
