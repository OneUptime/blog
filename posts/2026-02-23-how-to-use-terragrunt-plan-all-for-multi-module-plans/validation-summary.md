# Validation Summary: How to Use Terragrunt plan-all for Multi-Module Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- Infrastructure as Code
- GitHub Actions
- CI/CD planning workflows

## Sources Consulted
- Terragrunt CLI `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt HCL `dependency` block reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables

## Issues Found
- The post described `run-all plan` as the modern command. Terragrunt's current CLI redesign documentation deprecates `run-all` in favor of `terragrunt run --all plan`, so the post now uses `run --all` for new examples and describes `plan-all` / `run-all` as legacy or deprecated.
- Several examples used deprecated `--terragrunt-*` flags. Updated them to current flags: `--non-interactive`, `--log-level`, `--parallelism`, `--queue-include-dir`, and `--queue-exclude-dir`.
- Examples that pass Terraform-specific flags now use `--` to separate Terragrunt arguments from Terraform arguments where appropriate.
- The provider-cache recommendation used `TF_PLUGIN_CACHE_DIR` for a multi-unit run. Current Terragrunt docs warn against this with `run --all`, so the post now recommends Terragrunt's provider cache server via `--provider-cache`.
- The variable override section said undeclared variables would show a warning. Terraform errors for undeclared variables passed with `-var`, while variable definition files produce warnings, so the note now distinguishes those cases.
- The saved-plan location was too specific. Updated it to say plans are written to each unit's Terraform working directory, often under `.terragrunt-cache` when a remote `source` is used.

## Review Notes
The post remains technically relevant. `plan-all` is legacy terminology, but the article now clearly points readers to the current `run --all plan` workflow while preserving the older command context.
