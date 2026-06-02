# Validation Summary: How to Use TFLint for Terraform Linting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TFLint
- TFLint AWS ruleset
- TFLint Terraform language ruleset
- Terraform CLI
- AWS Terraform provider resources
- GitHub Actions
- pre-commit
- Checkov

## Sources Consulted
- TFLint README and CLI reference: https://github.com/terraform-linters/tflint
- TFLint configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint plugin documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md
- TFLint annotations documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint module calling documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/calling-modules.md
- TFLint AWS ruleset README and rule list: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS deep checking documentation: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/deep_checking.md
- TFLint Terraform ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-terraform
- setup-tflint GitHub Marketplace documentation: https://github.com/marketplace/actions/setup-tflint
- pre-commit-terraform README and hook manifest: https://github.com/antonbabenko/pre-commit-terraform
- Terraform validate command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform fmt command documentation: https://developer.hashicorp.com/terraform/cli/commands/fmt

## Issues Found
- The introduction implied TFLint generally validates nonexistent AMIs and AWS API constraints. Updated the wording to clarify that AWS API reads require AWS deep checking.
- The Homebrew installation command used `brew install tflint`, while the current TFLint documentation uses `brew install terraform-linters/tap/tflint`. Updated the command.
- The Linux installation command used the older install script. Replaced it with the current release download and install flow from TFLint's README.
- The Docker example only ran `tflint`, which is incomplete for configurations with external plugins. Added the documented Docker command that runs `tflint --init && tflint`.
- The configuration used `module = true`, which was removed in TFLint v0.54.0. Replaced it with `call_module_type = "all"`.
- The AWS ruleset version was pinned to `0.30.0`. Updated it to the current `0.47.0` release.
- The comment for `force = false` incorrectly described warning handling. Updated it to describe TFLint's exit behavior.
- The specific-directory command used a positional path argument, which TFLint removed in v0.47. Replaced it with `--chdir=./terraform/modules/vpc`.
- The IAM action typo example was not supported by a documented TFLint AWS ruleset rule. Replaced it with an invalid security group protocol example that triggers `aws_security_group_rule_invalid_protocol`.
- The previous-generation instance type example was introduced as "referencing nonexistent attributes." Updated the text to accurately describe the rule.
- The GitHub Actions workflow used older `setup-tflint@v4`, TFLint `v0.50.0`, and `secrets.GITHUB_TOKEN`. Updated it to `setup-tflint@v6`, TFLint `v0.62.1`, and `${{ github.token }}`.
- The GitHub Actions path pattern used `**.tf`. Updated it to `**/*.tf`.
- The pre-commit configuration used `terraform-linters/tflint` as a pre-commit repository and hook id `tflint`; that repository does not provide a pre-commit hook manifest. Replaced it with `antonbabenko/pre-commit-terraform` and hook id `terraform_tflint`.
- The manual pre-commit command still used the old hook id. Updated it to `pre-commit run terraform_tflint --all-files`.
- The module scanning section used the removed `module` option. Replaced it with `call_module_type = "all"` and clarified the `terraform init` requirement for remote modules.
- The summary claimed TFLint catches errors that no other Terraform ecosystem tool handles. Reworded it to the narrower and accurate claim that TFLint catches errors Terraform's built-in validation does not.

## Review Notes
Validated the updated TFLint configuration locally with TFLint v0.62.1 and confirmed AWS ruleset v0.47.0 installs with `tflint --init`. Also smoke-tested the corrected invalid instance type and invalid security group protocol examples; TFLint reported the expected `aws_instance_invalid_type` and `aws_security_group_rule_invalid_protocol` findings.
