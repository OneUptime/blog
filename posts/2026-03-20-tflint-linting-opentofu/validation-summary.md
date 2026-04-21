# Validation Summary: How to Use tflint for Linting OpenTofu Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- TFLint
- TFLint ruleset plugins for AWS, Google, and Terraform language rules
- GitHub Actions
- pre-commit

## Sources Consulted
- TFLint README and CLI usage: https://github.com/terraform-linters/tflint
- TFLint configuration docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint module calling docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/calling-modules.md
- TFLint plugin docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md
- TFLint Terraform language rules docs: https://github.com/terraform-linters/tflint-ruleset-terraform/tree/main/docs/rules
- TFLint AWS ruleset README and source: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint Google ruleset README: https://github.com/terraform-linters/tflint-ruleset-google
- OpenTofu validate command docs: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu files and extensions docs: https://opentofu.org/docs/language/files/
- reviewdog/action-tflint README: https://github.com/reviewdog/action-tflint
- pre-commit-terraform README: https://github.com/antonbabenko/pre-commit-terraform

## Issues Found
- The introduction described `tofu validate` as only catching syntax errors and said TFLint catches missing required module arguments. Updated this to reflect OpenTofu validation more accurately: `tofu validate` checks syntax, argument names and types, and internal consistency, while TFLint complements it with lint and provider-specific findings.
- The Docker example used `ghcr.io/terraform-linters/tflint-bundle`, which is not the current official image recommended by TFLint. Replaced it with the official `ghcr.io/terraform-linters/tflint` Docker command.
- The post referred to TFLint provider plugins. Updated wording to TFLint ruleset plugins to avoid confusion with Terraform/OpenTofu provider plugins.
- The `.tflint.hcl` snippet used the deprecated `module = true` option and called it "OpenTofu module mode". Replaced it with the current `call_module_type = "all"` setting and corrected the `force = false` comment.
- The AWS and Google ruleset plugin versions were outdated. Updated AWS to `0.47.0` and Google to `0.39.0` based on current upstream examples.
- The `--minimum-failure-severity=error` comment said it shows only errors. Corrected it to say it only changes failure behavior; warnings and notices are still printed.
- The AWS example claimed `t2.nano` is invalid. `t2.nano` is a valid EC2 instance type, so the example was changed to `t1.2xlarge`, matching the upstream AWS ruleset example and current rule behavior.
- The GitHub Actions snippet used `reviewdog/action-tflint@master` and the old `--module` flag. Updated it to `reviewdog/action-tflint@v1.25.0`, enabled `tflint_init`, and replaced the flag with `--call-module-type=all`.
- The pre-commit snippet used an old hook revision and did not pass the current module-calling flag. Updated the revision to `v1.104.0` and added `--args=--call-module-type=all`.

## Review Notes
- TFLint is still documented upstream as a Terraform linter. The post now scopes its advice to Terraform-compatible OpenTofu configurations; teams using OpenTofu-only `.tofu` files or OpenTofu-only language features should test TFLint behavior in their workflow.
- `tflint` was not installed locally in this environment, so CLI validation was performed against official documentation and upstream source, with Git tag existence checked for the updated action and pre-commit versions.
