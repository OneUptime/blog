# Validation Summary: How to Use TFLint with OpenTofu - With

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- TFLint
- TFLint Terraform language ruleset
- TFLint AWS ruleset
- HCL
- pre-commit

## Sources Consulted
- TFLint README and CLI usage: https://github.com/terraform-linters/tflint
- TFLint configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint plugin configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md
- TFLint annotations documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint module-calling documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/calling-modules.md
- TFLint Terraform ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-terraform
- TFLint AWS ruleset README and rules documentation: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS ruleset latest release: https://github.com/terraform-linters/tflint-ruleset-aws/releases/tag/v0.47.0
- TFLint AWS `aws_resource_missing_tags` rule documentation: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/rules/aws_resource_missing_tags.md
- OpenTofu `validate` command documentation: https://opentofu.org/docs/v1.9/cli/commands/validate/
- pre-commit-opentofu README and hook definitions: https://github.com/tofuutils/pre-commit-opentofu
- pre-commit-opentofu latest release: https://github.com/tofuutils/pre-commit-opentofu/releases/tag/v2.3.0

## Issues Found
- The introduction said `tofu validate` checks syntax only. Updated it to say it checks syntax and internal consistency, matching the OpenTofu documentation.
- The introduction described TFLint as designed for both Terraform and OpenTofu. Updated it to the more precise wording that TFLint is a Terraform configuration linter usable in OpenTofu workflows.
- The AWS ruleset version was outdated at `0.30.0`. Updated it to `0.47.0`, the latest release available during review.
- The `tflint --format=compact` comment said "Show detailed output." Updated it to "Show compact output" because `compact` is a concise output format.
- The recursive command comment implied all modules. Updated it to "directories/modules" to match TFLint's documented recursive behavior.
- The invalid resource example used an AMI comment that could imply non-deep checking catches AMI validity. Replaced it with the official-style invalid instance type example.
- The pre-commit sample used `terraform-linters/tflint` as a pre-commit repo with hook id `tflint`, but that repository does not publish a `.pre-commit-hooks.yaml`. Updated it to `tofuutils/pre-commit-opentofu` with `tofu_tflint`.
- The exit code table had issue and error exit codes reversed. Updated it to TFLint's documented defaults: `1` for errors and `2` for issues.
- The example shell fallback said "Linting issues found" for every non-zero exit. Updated it to cover both runtime failures and lint issues.

## Review Notes
- TFLint and OpenTofu were not installed in the local environment, so verification was performed against official documentation, project documentation, and GitHub release metadata.
- The AWS AMI validity rule is a deep-checking rule and may require AWS credentials; the post now avoids implying that the default sample configuration catches AMI validity.
