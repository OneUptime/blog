# Validation Summary: How to Use Trivy for OpenTofu Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Trivy
- Terraform/OpenTofu HCL
- AWS provider and S3 backend
- GitHub Actions
- GitHub code scanning SARIF uploads

## Sources Consulted
- Trivy Terraform/IaC coverage documentation: https://trivy.dev/docs/latest/coverage/iac/terraform/
- Trivy `config` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Aqua Security Trivy supply-chain advisory GHSA-69fq-xp46-6x23: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command documentation: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `refresh` command documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu setup action README: https://github.com/opentofu/setup-opentofu
- AWS configure credentials action README: https://github.com/aws-actions/configure-aws-credentials
- GitHub artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- `actions/upload-artifact` README: https://github.com/actions/upload-artifact
- `actions/download-artifact` README: https://github.com/actions/download-artifact
- CodeQL Action SARIF upload documentation: https://github.com/github/codeql-action

## Issues Found
- The original post did not include any Trivy commands or workflow steps even though the title and description promised Trivy-based OpenTofu security scanning. Added Trivy as a prerequisite, added `trivy --version`, added `trivy config` scans for HCL and plan JSON, and added Trivy GitHub Action scans.
- The original wording described IaC scanning as vulnerability and compliance scanning. Trivy's IaC `config` target primarily detects misconfigurations and can scan secrets in Terraform/OpenTofu files, so the description and introduction were corrected.
- The original workflow used deprecated `actions/upload-artifact@v3` and `actions/download-artifact@v3`. Updated the artifact actions and added a short retention period because saved OpenTofu plan files can contain sensitive data.
- The workflow did not include SARIF upload permissions for Trivy results. Added `security-events: write` and `github/codeql-action/upload-sarif@v4` steps.
- The workflow pinned OpenTofu to the old `1.7.0` example version. Removed the explicit version from the setup action so the example follows the action's default latest-version behavior.
- The workflow used `aws-actions/configure-aws-credentials@v4`, which is no longer the current major version. Updated it to `@v6`.
- The apply step used `tofu apply -auto-approve tfplan`; OpenTofu ignores `-auto-approve` when applying a saved plan because passing the plan file is already treated as approval. Removed the ignored flag.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu marks as deprecated because its default behavior can be unsafe. Replaced it with `tofu plan -refresh-only` and `tofu apply -refresh-only` after review.

## Review Notes
- The Trivy action version was set to `aquasecurity/trivy-action@0.35.0`, which Aqua identifies as a known-safe version after the March 2026 Trivy supply-chain incident. For higher-assurance production workflows, pin third-party actions to reviewed commit SHAs.
- The S3 backend example with `dynamodb_table` remains valid. OpenTofu 1.10+ also supports native S3 locking with `use_lockfile = true`, which could be mentioned in a future update.
- The HCL snippets are partial examples and reference variables such as `var.aws_region`, `var.environment`, and `var.repository_url` that must be declared elsewhere in a complete module.
