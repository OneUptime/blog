# Validation Summary: How to Test Migrations Before Applying in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state and workspaces
- Terraform plan JSON output
- Terratest
- Open Policy Agent and Rego
- GitHub Actions
- jq

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform workspaces documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform `show -json` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- Terraform override files documentation: https://developer.hashicorp.com/terraform/language/files/override
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terraform JSON Go package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-json
- Open Policy Agent documentation: https://www.openpolicyagent.org/docs
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language

## Issues Found
- The `terraform plan -detailed-exitcode` command was piped through `tee` without preserving Terraform's exit code. Added `set -o pipefail` so exit codes 0, 1, and 2 remain meaningful.
- The workspace test created an empty workspace and then used `terraform state push` to copy state. Changed it to `terraform state pull` followed by `terraform workspace new -state=...`, which is the documented way to initialize a new workspace from an existing state file.
- The state dry-run section incorrectly stated that `terraform state mv -dry-run` is not available. Updated the example to use the native `-dry-run` option and kept `state pull` plus `jq` as additional inspection.
- The Terratest example used `InitAndPlanAndShow` as if it returned a structured plan with `ResourceChangesDestroy`. Updated it to use `InitAndPlanAndShowWithStruct`, inspect `ResourceChangesMap`, and call the Terraform JSON action helper. Also added a shared local backend path so the initial and migrated configurations operate on the same test state.
- The Rego policy used older rule syntax and did not actually enforce the stated "only moves and no-ops" policy because creates and updates were not denied. Updated the snippet to Rego v1-style syntax and added checks for non-no-op changes.
- The canary `terraform state mv` examples did not quote indexed resource addresses. Added Unix-shell quoting as recommended by Terraform documentation.
- The GitHub Actions pipeline used `terraform plan -detailed-exitcode` directly, which would fail the job on exit code 2 before the destructive-change check ran. Updated the workflow step to fail only on exit code 1 and continue on exit code 2.

## Review Notes
Terraform and OPA were not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output. The clone-and-test backend override uses Terraform override-file behavior and is technically valid, but future revisions could add cleanup and safer copy exclusions for `.terraform` and local state files.
