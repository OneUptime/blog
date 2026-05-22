# Validation Summary: How to Use Snapshot Testing for Terraform Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform JSON plan output
- Terraform native test framework
- Terratest
- Go
- Bash
- jq
- GitHub Actions

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `os` package documentation: https://pkg.go.dev/os
- Testify assertion documentation: https://pkg.go.dev/github.com/stretchr/testify/assert
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- HashiCorp Setup Terraform GitHub Action: https://github.com/hashicorp/setup-terraform
- GitHub `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact

## Issues Found
- The Bash snapshot script computed `SNAPSHOT_FILE` as a relative path before changing into the module directory, so `./scripts/snapshot-test.sh modules/networking` would look for `modules/networking/tests/snapshots/...` instead of the repo-level `tests/snapshots/...`. Updated the script to capture `ROOT_DIR` and build an absolute snapshot path, and quoted the `basename` argument.
- The `jq` filter assumed `.resource_changes` always exists. Updated it to use `(.resource_changes // [])[]` so empty or missing resource changes do not break normalization.
- The Terraform native test example used `plan.resource_changes`, but Terraform test assertions can reference named values and outputs, not the full JSON plan object. Replaced the snippet with valid `command = plan` assertions against planned resource attributes and collection lengths.
- The Terratest example ignored errors from `os.MkdirAll` and `os.WriteFile`. Updated it to check those errors with `require.NoError`.
- The Terratest snapshot struct included `output_changes`, but `extractSnapshot` did not populate it. Updated the extraction function to include `output_changes` when present.
- The Python normalizer stored filtered planned values under `after_known`, but the value came from Terraform's `after` field, not `after_unknown`. Renamed the output key to `after`.

## Review Notes
Terraform `show -json` plan output can contain sensitive values in plain text, so snapshots and CI artifacts should be treated as potentially sensitive. The post's examples remain intentionally illustrative; real modules may need additional normalization for nested provider-computed fields.
