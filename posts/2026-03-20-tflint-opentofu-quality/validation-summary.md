# Validation Summary: How to Use TFLint for OpenTofu Code Quality

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- TFLint
- TFLint Terraform language ruleset
- TFLint AWS ruleset
- AWS provider for OpenTofu/Terraform
- GitHub Actions

## Sources Consulted
- TFLint README and CLI usage: https://github.com/terraform-linters/tflint
- TFLint configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint Terraform language ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-terraform
- TFLint AWS ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-aws
- setup-tflint GitHub Action documentation: https://github.com/terraform-linters/setup-tflint
- OpenTofu CLI plan documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI refresh documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu input variable validation documentation: https://opentofu.org/docs/language/values/variables/
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- actions/download-artifact documentation: https://github.com/actions/download-artifact
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- opentofu/setup-opentofu GitHub Action documentation: https://github.com/opentofu/setup-opentofu

## Issues Found
- The post claimed to show TFLint for OpenTofu code quality but did not include TFLint installation verification, configuration, local execution, or CI execution. Added a TFLint prerequisite, `tflint --version`, a `.tflint.hcl` example using the bundled Terraform ruleset and AWS ruleset, local `tflint --init` and lint commands, and matching GitHub Actions steps.
- Recursive TFLint commands should pass the root config path explicitly so nested directories use the same `.tflint.hcl`. Updated recursive commands to include `--config "$(pwd)/.tflint.hcl"`.
- The workflow used deprecated `actions/upload-artifact@v3` and `actions/download-artifact@v3`. Updated them to the current documented artifact actions, `actions/upload-artifact@v7` and `actions/download-artifact@v8`.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe by default. Replaced it with `tofu plan -refresh-only` and review-before-apply guidance.

## Review Notes
- The OpenTofu backend, provider requirement, variable validation, plan, show, apply, state, and refresh-only commands are technically valid for the versions discussed.
- The examples still use placeholders such as `backend.tfvars`, `production.tfvars`, cloud credentials, and `aws_instance.main`; readers must adapt those names to their actual configuration.
- The S3 backend example uses DynamoDB locking, which remains valid for OpenTofu v1.6 and v1.7. Newer OpenTofu versions also support native S3 lockfiles, but changing the backend approach was not required for correctness.
