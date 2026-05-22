# Validation Summary: How to Use Infracost with Terraform for Cost Estimation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Infracost CLI
- Terraform CLI
- YAML configuration
- CI/CD cost review workflows
- Cloud cost management / FinOps

## Sources Consulted
- Infracost Get Started documentation: https://www.infracost.io/docs/
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost config file documentation: https://www.infracost.io/docs/features/config_file/
- Infracost usage costs documentation: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost CLI v2.1.0 `--help`, `scan --help`, `inspect --help`, `ci setup --help`, `budgets --help`, and `guardrails --help`
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- The post used the legacy Infracost install script from `infracost/infracost`. Updated the Linux install command to the current `infracost/cli` install script.
- The Docker install example referenced the legacy `infracost/infracost` image. Replaced it with the current documented Windows Chocolatey install example.
- The authentication section used `infracost configure set api_key`, which is not part of the current v2 CLI. Updated it to `infracost auth login` and `INFRACOST_CLI_AUTHENTICATION_TOKEN` for CI/CD.
- The post used legacy `infracost breakdown`, `infracost diff`, `infracost output`, `--format`, `--config-file`, and `--usage-file` examples. Updated the examples to the current `infracost scan`, `infracost inspect`, `infracost ci setup`, `infracost budgets`, and `infracost guardrails` workflow.
- The Terraform plan JSON section described a legacy Infracost workflow. Updated it to the current directory-scanning workflow because current `infracost scan` takes an IaC directory and caches results for `inspect`.
- The usage file section showed a usage file but did not configure the current CLI to read it. Added the documented `usage_file` reference in `infracost.yml`.
- The Terraform workflow wrapper passed a Terraform plan JSON to legacy Infracost commands. Updated it to run `terraform plan -out=tfplan.binary`, then `infracost scan` and `infracost inspect --summary`, while preserving the saved-plan apply flow.

## Review Notes
The current Infracost documentation has some remaining references to the legacy `breakdown`/`diff` workflow on older or indexed pages, but the current get-started page, command documentation, and v2.1.0 CLI help expose the `scan`/`inspect` workflow. The post was updated to match the current v2 CLI.
