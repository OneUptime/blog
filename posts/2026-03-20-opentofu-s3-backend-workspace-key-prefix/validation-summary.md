# Validation Summary: How to Configure S3 Backend with workspace_key_prefix in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend, workspaces, state management)
- Terraform-compatible HCL configuration
- AWS S3 (state storage)
- AWS DynamoDB (state locking)
- `tofu` CLI (workspace, state subcommands)
- `aws` CLI (s3 ls)

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu workspaces documentation (general knowledge of `terraform.workspace` and default workspace name `default`)

## Issues Found
No technical issues found.

Verified items:
- Default `workspace_key_prefix` is `env:` — confirmed by official docs.
- Non-default workspace path structure is `<workspace_key_prefix>/<workspace_name>/<key>` — all four directory-tree examples in the post correctly reflect this pattern given their respective `key` and `workspace_key_prefix` values.
- The default workspace stores state at the bare `key` (no prefix injected) — correctly shown in every example.
- HCL syntax in all backend configuration blocks is valid.
- `dynamodb_table` is still a supported configuration option (not deprecated) per current OpenTofu docs.
- `terraform.workspace` interpolation and the `default` workspace name are correctly used.
- `tofu workspace select` and `tofu state list` are valid OpenTofu CLI commands.
- `aws s3 ls --recursive` flag is correct.

## Review Notes
- The first example ("Default Workspace Key Structure") shows `production/terraform.tfstate` as the default-workspace path without explicitly stating that this implies `key = "production/terraform.tfstate"`. The structure shown is technically correct given that implied key, but readers may briefly conflate the path segment "production" with a workspace name. Not an error — just a clarity consideration for future revisions.
- OpenTofu 1.10+ introduced native S3 state locking via `use_lockfile = true`, which is an alternative to `dynamodb_table`. Both options remain fully supported per the OpenTofu docs (no deprecation plans), so the example using `dynamodb_table` is not outdated. A future revision could mention `use_lockfile` as an alternative, but the current content is accurate.
- The post uses the `terraform { backend "s3" { ... } }` block form, which OpenTofu supports for compatibility. OpenTofu also accepts `tofu { ... }` blocks; either is correct.
