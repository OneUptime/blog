# Validation Summary: How to Test OpenTofu Configurations with tflint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- TFLint
- TFLint AWS ruleset
- TFLint Terraform language ruleset
- GitHub Actions
- Go

## Sources Consulted
- TFLint README and CLI help: https://github.com/terraform-linters/tflint
- TFLint configuration guide: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint plugin configuration guide: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md
- TFLint AWS ruleset README and rules list: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS deep checking documentation: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/deep_checking.md
- TFLint Terraform ruleset README and rule docs: https://github.com/terraform-linters/tflint-ruleset-terraform
- TFLint plugin developer guide and ruleset template: https://github.com/terraform-linters/tflint/blob/master/docs/developer-guide/plugins.md
- setup-tflint GitHub Action documentation and releases: https://github.com/terraform-linters/setup-tflint
- OpenTofu validate command documentation: https://opentofu.org/docs/cli/commands/validate/

## Issues Found
- The post said tflint works without cloud credentials without qualification. I clarified that local/static checks do not need credentials, but AWS deep checking uses provider credentials for read-only account checks.
- The AWS ruleset version was outdated. I updated the example from `0.32.0` to the current `0.47.0`.
- The installation snippet showed `tflint --init` before the `.tflint.hcl` plugin block. I clarified that it should be run after creating the config so the configured rulesets are installed.
- The recursive examples used `tflint --recursive` alone while the post places `.tflint.hcl` at the project root. I updated the recursive commands to pass `--config "$(pwd)/.tflint.hcl"` so recursive runs share the root config as documented.
- The JSON output command was mislabeled as showing all rules. I changed the comment to say it saves lint results as JSON.
- The `aws_instance_invalid_type` example used `t2.xlarge`, which is not an invalid instance type example. I changed it to `t1.2xlarge`, matching the official AWS ruleset documentation's invalid-type example.
- The `--only` example used a comma-separated list, which TFLint treats as a single unknown rule name. I changed it to repeat `--only` once per rule.
- The custom Go rule snippet imported `hclext` without using it and did not implement `Check`. I added a minimal `Check` implementation that evaluates `aws_s3_bucket.bucket` and emits an issue when the name does not start with the required prefix.
- The GitHub Actions example used older versions. I updated `terraform-linters/setup-tflint` from `v4` to `v6` and TFLint from `v0.50.0` to `v0.62.0`.

## Review Notes
TFLint upstream documentation still describes TFLint as a Terraform linter, while OpenTofu uses Terraform-language-compatible configuration. OpenTofu-specific language features should be checked separately when they are used. The local environment did not have `tofu` or `tflint` preinstalled, so I verified TFLint CLI behavior with a temporary TFLint v0.62.0 binary.
