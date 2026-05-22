# Validation Summary: How to Test Terraform Rollback Procedures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform test files (`.tftest.hcl`)
- Terratest
- Go
- Bash
- AWS Route 53
- AWS S3 backend state storage

## Sources Consulted
- Terraform CLI `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform state backends and manual state pull/push documentation: https://developer.hashicorp.com/terraform/language/state/backends
- Terraform CLI `plan` command reference, including `-detailed-exitcode`: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `destroy` command reference, including `-target`: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform CLI `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform CLI `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terratest Terraform module Go documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform

## Issues Found
- The Git revert rollback script counted top-level JSON keys in the pulled state file instead of resources. Changed `jq 'length'` to `jq '.resources | length'` so the baseline count matches the current resource-count check.
- The state restore script used `set -e` while running `terraform plan -detailed-exitcode`. Because Terraform exits with code `2` when a plan succeeds with changes, the script would exit before checking `$?`. Wrapped the plan command with `set +e` / `set -e` so the documented exit-code handling works.
- The state restore script labeled `terraform state push` as local-state-only and implied direct S3 object replacement as the normal remote-state path. Updated the comments to reflect that `terraform state push` works with the configured backend and that direct S3 version restoration should only happen after ensuring no other Terraform runs are active.
- The Terratest Go example used `os.WriteFile` without importing `os`. Added the import.
- The Terratest state restore example captured `terraform state pull` using `RunTerraformCommand`, which returns combined stdout/stderr. Changed it to `RunTerraformCommandAndGetStdout` so the saved state content is only stdout JSON.
- The Terratest Go example ignored the error returned by `os.WriteFile`. Added `require.NoError` so file-write failures fail the test.
- The Terratest examples used separate fixture directories without stating that they must share the same backend/state. Added a short note clarifying that the fixtures must operate on the same Terraform state.
- The blue-green Terraform snippet referenced `var.blue_version`, `var.green_version`, and `var.zone_id` without declaring those input variables. Added minimal variable declarations.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation instead of local `terraform --help` output. The targeted destroy section is technically valid, but future revisions could add a stronger warning that `-target` is intended for exceptional workflows and can leave related changes unapplied if used casually.
