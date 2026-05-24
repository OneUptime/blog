# Validation Summary: How to Fix Terraform Backend Migration Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (CLI, backend configuration, state management)
- AWS S3 backend
- AWS DynamoDB (state locking)
- Terraform Cloud (`cloud` block)
- Terraform workspaces
- tfenv (Terraform version manager)
- AWS CLI

## Sources Consulted
- Terraform `init` command — https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `force-unlock` command — https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- S3 backend configuration — https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform Cloud `cloud` block — https://developer.hashicorp.com/terraform/cli/cloud/settings
- `terraform state pull` — https://developer.hashicorp.com/terraform/cli/commands/state/pull
- `terraform show` — https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform state documentation — https://developer.hashicorp.com/terraform/language/state

## Issues Found

1. **Misleading description of `terraform init -reconfigure`** — The original text stated "This discards the old state and starts with an empty state." This is technically incorrect: `-reconfigure` does not delete or discard state from the old backend. It only ignores the previously saved backend configuration and skips state migration. The old state remains intact in the old backend. Updated the wording to clarify that the old state is not deleted but remains in the old backend untouched, while the new backend starts empty (unless it already had state).

## Review Notes

- The hypothetical error in "Error 5: State Version Mismatch" references state "version 5". As of early 2026, Terraform state files use version 4 (since Terraform 0.12). Version 5 does not exist yet, but the example serves as an illustration of the general scenario where local Terraform is older than the state's format. Left as-is since it's clearly an illustrative error.
- The S3 backend example uses `dynamodb_table` for state locking. This argument is still supported but is deprecated in favor of native S3 locking via `use_lockfile = true` introduced in Terraform 1.10+. The post's content remains correct for users not on the latest Terraform, but a future revision could mention `use_lockfile` as the modern alternative.
- The `region` argument for the S3 backend is described as required. Strictly speaking, it can be sourced from `AWS_REGION` / `AWS_DEFAULT_REGION` environment variables, but in practice most users include it in the backend block, so the guidance is practically correct.
- The Terraform Cloud `cloud` block syntax is correct and current (introduced in Terraform 1.1).
- All CLI commands (`terraform init -migrate-state`, `terraform force-unlock`, `terraform state pull`, `terraform workspace list/select`, `terraform show -json`) are syntactically correct and current.
