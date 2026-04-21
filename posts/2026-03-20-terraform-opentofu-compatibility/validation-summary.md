# Validation Summary: How to Maintain Compatibility Between Terraform and OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- AWS provider for Terraform/OpenTofu
- S3 remote state backend
- GitHub Actions
- Infrastructure as Code

## Sources Consulted
- OpenTofu settings and `terraform` block documentation: https://opentofu.org/docs/language/settings/
- OpenTofu version constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- OpenTofu CLI `init`, `plan`, `apply`, `show`, `state list`, `state show`, and `refresh` command documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu setup GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- GitHub `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact
- GitHub `actions/download-artifact` documentation: https://github.com/actions/download-artifact
- GitHub artifact actions v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated and recommends S3 lockfiles via `use_lockfile`. I replaced `dynamodb_table = "terraform-locks"` with `use_lockfile = true`.
- Because S3 lockfile support is not available in OpenTofu 1.6 and is documented in OpenTofu 1.10+, I changed the prerequisite and `required_version` constraint from v1.6+ to v1.10+.
- The GitHub Actions workflow pinned OpenTofu 1.7.0, which does not support the updated S3 lockfile backend argument. I changed the setup action version to OpenTofu 1.11.0.
- The workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. GitHub retired v3 artifact actions for GitHub.com starting January 30, 2025, so I updated them to the current documented `actions/upload-artifact@v7` and `actions/download-artifact@v8`.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe by default. I replaced it with `tofu apply -refresh-only`, which lets users review state refresh changes before committing them.

## Review Notes
The remaining HCL snippets, provider requirement syntax, variable validation, and OpenTofu CLI commands are consistent with current documentation. The local environment does not have `tofu` or `terraform` installed, so validation was performed against official documentation rather than by executing the examples.
