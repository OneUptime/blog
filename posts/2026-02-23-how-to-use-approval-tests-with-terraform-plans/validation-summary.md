# Validation Summary: How to Use Approval Tests with Terraform Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan output
- Terraform JSON plan format
- Go
- Terratest
- Testify
- Bash
- GitHub Actions

## Sources Consulted
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- GitHub Script action documentation: https://github.com/actions/github-script
- Related OneUptime post link: https://oneuptime.com/blog/post/2026-02-23-how-to-use-snapshot-testing-for-terraform-plans/view
- Related OneUptime post link: https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view

## Issues Found
- The Bash approval script used `terraform init -backend=false`. Terraform documents this flag as skipping backend configuration and recommends using it only when the working directory has already been initialized for a backend. In a fresh CI checkout, that can produce plans that do not use the intended backend/state or fail for backend-backed configurations. Changed it to `terraform init -input=false`.
- The Go Terratest text-plan example imported `encoding/json`, `fmt`, and `github.com/stretchr/testify/assert` without using them. Go rejects unused imports, so the snippet would not compile. Removed the unused imports.
- The first Go section said to use Go with an approval testing library, but the code uses Terratest and a custom approval helper rather than an approval testing library. Updated the sentence to say "use Go with Terratest."
- The `verifyApproval` helper ignored errors from `os.MkdirAll` and `os.WriteFile`. Updated those calls to use `require.NoError` so file setup/write failures fail the test clearly.
- The JSON approval example imported `os` without using it. Removed the unused import.
- The JSON approval example collected output names from a Go map without sorting them. Map iteration order is not deterministic, which could make approval output fluctuate across runs. Added `sort.Strings(approved.OutputNames)` and the required `sort` import.

## Review Notes
- The Terraform CLI flags `plan -input=false -no-color` are current and documented.
- Terratest `terraform.InitAndPlan` and `terraform.InitAndPlanAndShow` are current documented APIs.
- The JSON extraction uses Terraform's documented top-level `resource_changes` and `output_changes` fields and the documented `change.actions` structure.
- The shell and Go examples intentionally normalize or extract only selected plan content; users should review the normalization patterns for their provider and security requirements before committing approved baselines.
