# Validation Summary: How to Use Terragrunt with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- CI/CD pipelines
- AWS OIDC federation
- Google Cloud Workload Identity Federation
- AzureRM provider authentication
- GitHub CLI PR comments

## Sources Consulted
- Terragrunt run command and `run --all` flags: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt provider cache server: https://docs.terragrunt.com/features/caching/provider-cache-server/
- Terragrunt cache directory reference: https://docs.terragrunt.com/reference/terragrunt-cache/
- Terragrunt deprecated attributes migration: https://docs.terragrunt.com/migrate/deprecated-attributes/
- Terragrunt queue flags migration: https://docs.terragrunt.com/migrate/queue-to-filter/
- Terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform show command: https://developer.hashicorp.com/terraform/cli/commands/show
- AWS SDK web identity environment variables: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- Google Cloud Terraform authentication: https://cloud.google.com/docs/terraform/authentication
- AzureRM provider service principal authentication: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- GitHub CLI issue/PR comment command: https://cli.github.com/manual/gh_issue_comment

## Issues Found
- Replaced older Terragrunt `run-all` examples and `--terragrunt-*` flags with current `terragrunt run --all` syntax and current flags such as `--non-interactive`, `--parallelism`, and `--no-auto-retry`.
- Replaced the incorrect changed-module examples with `--filter-affected` for plan/apply and a Git filter expression for validate, matching the current Terragrunt filtering model.
- Fixed the pseudo-pipeline plan step. The original `terragrunt run-all show -json tfplan > plan-output.json` would not produce a valid single JSON output for multiple units. It now uses `--out-dir` and `--json-out-dir` to generate per-unit plan files and JSON plan files.
- Updated the caching guidance. Terragrunt documentation warns against using Terraform's shared plugin cache with `run --all`; the post now recommends Terragrunt's provider cache server and `TG_DOWNLOAD_DIR`.
- Corrected state-locking guidance to avoid implying that `-lock=false` is always safe. The post now limits that recommendation to cases where no concurrent apply can target the same state.
- Replaced removed Terragrunt retry attributes (`retryable_errors`, `retry_max_attempts`, and `retry_sleep_interval_sec` at the top level) with the current `errors { retry { ... } }` block.
- Updated `--terragrunt-ignore-dependency-errors` to the current `--queue-ignore-errors` flag.

## Review Notes
The Terragrunt and Terraform CLIs were not installed in the local environment, so command verification was done against current official documentation rather than local `--help` output. The cloud credential examples are intentionally minimal and still require CI-provider-specific OIDC or workload identity setup.
