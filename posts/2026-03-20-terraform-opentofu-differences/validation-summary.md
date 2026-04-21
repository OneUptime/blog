# Validation Summary: How to Understand the Differences Between Terraform and OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform configuration language / HCL
- AWS provider for OpenTofu/Terraform
- S3 remote backend with DynamoDB state locking
- GitHub Actions
- AWS OIDC authentication for GitHub Actions
- OpenTofu CLI environment variables

## Sources Consulted
- OpenTofu CLI environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `tofu show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `tofu refresh` command documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu input variable documentation: https://opentofu.org/docs/language/values/variables/
- opentofu/setup-opentofu GitHub Action documentation and releases: https://github.com/opentofu/setup-opentofu
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- actions/download-artifact documentation: https://github.com/actions/download-artifact
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The workflow used `opentofu/setup-opentofu@v1`, while the current setup action documentation and latest release use `@v2`. Updated both occurrences to `opentofu/setup-opentofu@v2`.
- The workflow used deprecated `actions/upload-artifact@v3` and `actions/download-artifact@v3`. GitHub states these fail after the v3 retirement date, so I updated them to the currently documented `actions/upload-artifact@v7` and `actions/download-artifact@v8`.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe by default. Replaced it with `tofu plan -refresh-only` plus review-before-apply guidance.

## Review Notes
- The OpenTofu CLI flags, S3 backend settings, DynamoDB locking configuration, provider default tags block, variable validation syntax, and saved-plan workflow are valid for the versions discussed.
- The workflow still pins OpenTofu `1.7.0`; that remains compatible with the shown examples, but the current stable release line is newer. A future editorial update could bump the example pin.
- The title and description frame the article as a Terraform/OpenTofu comparison, but the body is mainly an OpenTofu workflow tutorial. That is an editorial mismatch, not a technical correctness issue in the examples.
- The local environment did not have `tofu` or `terraform` installed, so validation was performed against official documentation rather than by executing the examples.
