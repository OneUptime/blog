# Validation Summary: How to Use tflint with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- TFLint
- TFLint AWS ruleset
- TFLint AzureRM ruleset
- TFLint Terraform language ruleset
- pre-commit
- Make

## Sources Consulted
- TFLint README and CLI usage: https://github.com/terraform-linters/tflint
- TFLint configuration docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint annotations docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint compatibility docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/compatibility.md
- TFLint architecture docs: https://github.com/terraform-linters/tflint/blob/master/docs/developer-guide/architecture.md
- TFLint v0.54.0 release notes: https://github.com/terraform-linters/tflint/releases/tag/v0.54.0
- TFLint AWS ruleset README and releases: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS ruleset deep checking docs: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/deep_checking.md
- TFLint AWS rule docs for deprecated resources and previous instance types: https://github.com/terraform-linters/tflint-ruleset-aws/tree/master/docs/rules
- TFLint AzureRM ruleset releases: https://github.com/terraform-linters/tflint-ruleset-azurerm/releases
- TFLint Terraform ruleset docs: https://github.com/terraform-linters/tflint-ruleset-terraform/tree/main/docs/rules
- OpenTofu validate command docs: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu fmt command docs: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu file extension docs: https://opentofu.org/docs/language/files/
- pre-commit-opentofu hooks: https://github.com/tofuutils/pre-commit-opentofu

## Issues Found
- TFLint/OpenTofu support was overstated. TFLint is officially a Terraform linter and reads Terraform-compatible `.tf` files, while OpenTofu also supports `.tofu` files. Updated the description and introduction to clarify Terraform-compatible OpenTofu configurations.
- The introduction incorrectly listed undeclared variables as something `tofu validate` cannot catch. Replaced that with unused declarations, which is a TFLint Terraform ruleset capability.
- The AWS and AzureRM plugin versions were outdated. Updated AWS to `0.47.0` and AzureRM to `0.31.1`, the current releases found during review.
- `tflint --format=detailed` is not a valid current formatter. Replaced it with `tflint --format=compact`.
- The deprecated S3 ACL example did not match a current TFLint AWS deprecation rule. Replaced it with `aws_security_group_rule`, which is covered by `aws_security_group_rule_deprecated`.
- The undeclared variable example was not an accurate TFLint-specific example. Replaced it with an unused variable declaration covered by `terraform_unused_declarations`.
- The required provider example was too vague. Replaced it with a provider block missing corresponding `required_providers` source/version constraints.
- The ignore annotation example described file-level ignoring but used a line-level annotation, and the annotation was placed too far from the flagged attribute. Updated the text and placed the annotation immediately before the `instance_type` attribute.
- The pre-commit example used `terraform-linters/tflint` as a pre-commit repo and the removed `--module` flag. Replaced it with the `tofu_tflint` hook from `tofuutils/pre-commit-opentofu` and `--args=--call-module-type=all`.
- The conclusion implied no TFLint checks need cloud credentials. Clarified that optional AWS deep checks require credentials.

## Review Notes
- The post now describes a correct workflow for OpenTofu projects that keep Terraform-compatible `.tf` files. Projects using OpenTofu-only `.tofu` files or OpenTofu-only language features should verify TFLint compatibility separately.
