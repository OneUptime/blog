# Validation Summary: How to Test Terraform-to-OpenTofu Compatibility

## Status
validated

## Post Type
Tutorial / migration testing guide

## Technologies Covered
- OpenTofu CLI
- Terraform CLI
- Terraform/OpenTofu plan JSON output
- Terraform/OpenTofu provider dependency locks
- OpenTofu provider registry
- Bash automation
- Terratest for Go
- AWS Terraform provider `aws_ssm_parameter`

## Sources Consulted
- OpenTofu migration guide: https://opentofu.org/docs/intro/migration/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `providers` command: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu dependency lock file: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu write-only attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu ephemerality examples: https://opentofu.org/docs/v1.11/language/ephemerality/
- Terraform `plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform dependency lock file: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform write-only arguments: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- Terraform Registry AWS `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terratest Terraform module API docs: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Author URL checked: https://github.com/nawazdhandala

## Issues Found
- The plan comparison text claimed the filtered JSON proved identical plans, but the commands only compared `resource_changes` addresses and action lists. Updated the wording to say it compares planned resource actions, sorted the changes by address before diffing, and changed the expected result comment accordingly.
- The OpenTofu plan JSON command used legacy positional `tofu show <filename>` syntax. Updated it to the current explicit `tofu show -json -plan=tofu-plan.binary` form documented by OpenTofu.
- The provider compatibility section implied `tofu providers` verifies registry availability and showed selected provider versions in `tofu providers` output. OpenTofu documents `tofu providers` as an inspection command for configuration/state provider requirements. Updated the example to use `tofu init` for installability, inspect versions from `.terraform.lock.hcl`, and show provider-address-style output for `tofu providers`.
- The automated Bash suite used `set -e` before reading `tofu plan -detailed-exitcode`, so exit code `2` would abort the script before the branch could handle it. Wrapped the plan command in an `if` statement and made detected changes fail the compatibility suite so the final success message only appears for no-change plans.
- The write-only attribute test wrote to `/tmp/test-write-only/main.tf` without creating the directory. Added `mkdir -p /tmp/test-write-only`.
- The write-only attribute test said OpenTofu 1.10+ and used the normal `value` argument with AWS provider `~> 5.0`. OpenTofu documents write-only attributes as OpenTofu 1.11 onward, and the AWS SSM Parameter write-only argument is `value_wo` with `value_wo_version`. Updated the snippet to require OpenTofu `>= 1.11`, AWS provider `~> 6.0`, and use `value_wo` plus `value_wo_version`.
- The feature test called the example OpenTofu-specific, but write-only attributes are version-specific rather than exclusive to OpenTofu. Updated the comment to say version-specific features.

## Review Notes
Terraform and OpenTofu CLIs were not installed in the local environment, so command behavior was validated against official documentation rather than executed locally. Saved plan files and `show -json` output can contain sensitive values; the post could mention that caveat in a future editorial pass, but it was outside the minimal correctness fixes.
