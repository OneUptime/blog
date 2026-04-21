# Validation Summary: How to Lint OpenTofu Configurations with TFLint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform language
- TFLint
- TFLint AWS ruleset
- TFLint AzureRM ruleset
- GitHub Actions

## Sources Consulted
- TFLint README and CLI usage: https://github.com/terraform-linters/tflint
- TFLint configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint working directory and recursive init documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/working-directory.md
- TFLint annotations documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint compatibility documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/compatibility.md
- TFLint AWS ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS rules documentation: https://github.com/terraform-linters/tflint-ruleset-aws/tree/master/docs/rules
- TFLint AzureRM ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-azurerm
- setup-tflint GitHub Action documentation: https://github.com/terraform-linters/setup-tflint
- OpenTofu validate command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu files and directories documentation: https://opentofu.org/docs/language/files/

## Issues Found
- Updated the introduction to avoid implying first-party OpenTofu support for all OpenTofu file types. TFLint documents itself as a Terraform linter and its loader reads Terraform `*.tf` files, while OpenTofu also supports `.tofu` files.
- Updated the AWS ruleset plugin version from `0.30.0` to `0.47.0` and the AzureRM ruleset plugin version from `0.26.0` to `0.31.1` to match the current official ruleset README examples.
- Changed the common-issues code fence from `bash` to `hcl` because the snippet contains Terraform/OpenTofu configuration, not shell commands.
- Replaced the `aws_alb` deprecated-resource example with `aws_security_group_rule`, which is covered by the documented `aws_security_group_rule_deprecated` TFLint AWS rule.
- Added required attributes to the HCL examples so the snippets are syntactically valid and closer to provider-valid examples.
- Corrected the required-tags note to reference the documented `aws_resource_missing_tags` rule and added a matching rule configuration example.
- Moved the `tflint-ignore` annotation to the line before the ignored attribute, matching the documented TFLint annotation format.
- Updated recursive CI examples to run `tflint --recursive --init` before `tflint --recursive`, matching TFLint's recursive initialization guidance.
- Updated the GitHub Action from `terraform-linters/setup-tflint@v4` to `terraform-linters/setup-tflint@v6`, matching the current official action README.

## Review Notes
TFLint is useful for OpenTofu projects that keep Terraform-compatible configuration in `.tf` files. For OpenTofu-specific `.tofu` files or OpenTofu-only language features, keep `tofu validate` in CI because TFLint's official compatibility target is Terraform syntax and semantics.
