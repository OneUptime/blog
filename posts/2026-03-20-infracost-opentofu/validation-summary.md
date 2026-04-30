# Validation Summary: How to Use Infracost for OpenTofu Cost Estimation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI and HCL
- Infracost CLI
- Infracost GitHub Actions
- GitHub Actions
- AWS provider for OpenTofu / Terraform
- AWS OIDC authentication for GitHub Actions

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command: https://opentofu.org/docs/v1.9/cli/commands/show/
- OpenTofu `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `refresh` command: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Infracost CLI commands: https://www.infracost.io/docs/features/cli_commands/
- Infracost getting started: https://www.infracost.io/docs/
- Infracost environment variables: https://www.infracost.io/docs/features/environment_variables/
- Infracost GitHub Actions repository README: https://github.com/infracost/actions
- OpenTofu setup action README: https://github.com/opentofu/setup-opentofu
- GitHub `upload-artifact` README: https://github.com/actions/upload-artifact

## Issues Found
- The original tutorial did not actually show Infracost usage in the core workflow. I replaced the generic `tofu show` and `tofu apply` steps with the documented OpenTofu plan JSON flow for Infracost: generate `tfplan.binary`, export it with `tofu show -json`, then run `infracost diff --path plan.json`.
- The GitHub Actions example described deployment jobs instead of pull request cost estimation. I replaced it with an Infracost pull request workflow that installs Infracost, exports the OpenTofu plan to JSON, generates Infracost JSON output, and posts a PR comment using `infracost comment github`.
- The workflow used stale action references for OpenTofu setup and deprecated artifact actions. I updated `opentofu/setup-opentofu@v1` to `@v2` and removed the deprecated `upload-artifact@v3` / `download-artifact@v3` flow as part of the corrected Infracost-based workflow.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe by default. I changed that guidance to `tofu plan -refresh-only` and updated the surrounding verification steps accordingly.
- Step 1 only covered OpenTofu setup even though Infracost authentication is required to retrieve pricing data. I added `infracost --version`, `infracost auth login`, and `INFRACOST_API_KEY` so the setup matches Infracost's documented prerequisites.

## Review Notes
- The post still uses an AWS-focused example workflow even though the setup section mentions Azure and GCP credentials. That is technically acceptable, but the examples are operationally centered on AWS.
- The HCL snippets are partial examples rather than a complete deployable project; they assume supporting variable definitions and any required tfvars files exist.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `infracost` was not possible in this workspace because neither CLI is installed, so the review relied on official OpenTofu, Infracost, and GitHub action documentation.
