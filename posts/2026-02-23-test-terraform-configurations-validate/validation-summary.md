# Validation Summary: How to Test Terraform Configurations with terraform validate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform HCL
- GitHub Actions
- GitLab CI
- pre-commit
- TFLint
- Trivy
- tfsec
- jq

## Sources Consulted
- Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform fmt command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform
- pre-commit-terraform README and releases: https://github.com/antonbabenko/pre-commit-terraform
- TFLint AWS ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-aws
- Trivy Terraform scanning documentation: https://trivy.dev/docs/latest/tutorials/misconfiguration/terraform/
- Trivy filtering documentation: https://trivy.dev/docs/dev/docs/configuration/filtering/
- AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The module source example said `terraform validate` catches invalid module sources. Updated it to state that `terraform init` catches missing or invalid module sources before validation runs.
- The CI examples pinned Terraform 1.8.5 and `hashicorp/setup-terraform@v3`. Updated them to Terraform 1.15.4 and `hashicorp/setup-terraform@v4`, matching current releases and action documentation.
- The pre-commit example pinned an older `pre-commit-terraform` release. Updated it to `v1.105.0`, the current documented release line found during review.
- The TFLint section implied invalid instance type checks are available generically. Clarified that these checks require provider rulesets.
- The security scanning section centered tfsec. Updated the examples to prefer `trivy config`, because Trivy documentation notes the consolidation of tfsec-related scanning into Trivy.
- The complete validation pipeline used `tfsec . --minimum-severity HIGH`. Updated it to `trivy config --severity HIGH,CRITICAL .`, matching current Trivy configuration scanning and filtering syntax.
- The variable validation section said custom validations run during `terraform validate`. Updated it to reflect Terraform documentation: variable validations are evaluated during planning, while validation can still catch invalid child module inputs in some module-validation contexts.

## Review Notes
- Terraform CLI was not installed in the local workspace, so command verification was performed against official/current documentation rather than local `terraform --help` output.
- The post is technically relevant and code-focused. After the targeted corrections above, the remaining examples and explanations are consistent with current Terraform CLI behavior and referenced tool documentation.
