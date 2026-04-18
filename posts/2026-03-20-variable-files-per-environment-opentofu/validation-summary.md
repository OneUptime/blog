# Validation Summary: How to Use Variable Files Per Environment in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- HCL (`.tf` and `.tfvars` files)
- GitHub Actions (`opentofu/setup-opentofu@v1`)
- S3 backend for remote state
- OpenTofu workspaces

## Sources Consulted
- OpenTofu backend configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu variables: https://opentofu.org/docs/language/values/variables/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu

## Issues Found
- **Invalid backend interpolation.** The original `backend.tf` example used `key = "infra/${terraform.workspace}/terraform.tfstate"`. Backend configuration blocks in OpenTofu/Terraform do not resolve `terraform.workspace` at `tofu init` time, and backends cannot reference values not available before state is loaded. Replaced the interpolated `key` with a static `key` plus an explicit `workspace_key_prefix`, and added a short note explaining that the S3 backend automatically stores each workspace's state at `<workspace_key_prefix>/<workspace_name>/<key>`.

## Review Notes
- The rest of the post is technically accurate: `tofu plan` / `tofu apply` with `-var-file` and `-auto-approve` are correct, variable declaration syntax and `.tfvars` assignment syntax are valid HCL, and `opentofu/setup-opentofu@v1` is a real, working GitHub Action reference.
- `opentofu/setup-opentofu@v2` was released on 2026-03-16 and is the current major version; `@v1` still works but readers may want to bump to `@v2` for the latest features. Left as-is since it is not incorrect.
- The post uses the `terraform { ... }` settings block rather than the equivalent `tofu { ... }` block that OpenTofu also supports. Both are valid in OpenTofu; no change needed.
