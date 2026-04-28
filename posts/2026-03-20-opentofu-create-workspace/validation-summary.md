# Validation Summary: How to Create a New Workspace in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI commands and workspace management)
- Terraform (compatibility — `terraform.workspace` reference)
- HCL (HashiCorp Configuration Language)
- AWS S3 backend
- AWS resources (S3 bucket, Auto Scaling Group) used as illustrative examples

## Sources Consulted
- OpenTofu `workspace new` command: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu `workspace list` command: https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu workspaces overview: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu local backend: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
- **S3 backend state path format was incorrect.** The post originally showed the path as `s3://bucket/prefix/env:/staging/terraform.tfstate`, placing a generic "prefix" before the `env:` workspace key prefix. This is wrong: per the official S3 backend documentation, the state path for non-default workspaces is `<workspace_key_prefix>/<workspace_name>/<key>` — the `workspace_key_prefix` (default `env:`) is prepended *before* the workspace name and the key follows after. Updated the example to `s3://bucket/env:/staging/terraform.tfstate` (and same for `production`) and added a brief inline note clarifying the actual format.

## Review Notes
- The `tofu workspace new <name>` command, the `-state=path` flag, the example output text, the local backend directory layout (`terraform.tfstate.d/<workspace>/terraform.tfstate`), the `tofu workspace list` output format with `*` denoting the active workspace, and `terraform.workspace` in HCL all match the current OpenTofu documentation.
- The HCL examples are syntactically valid. Resource attribute references (`local.config.min_capacity`) and the `${terraform.workspace}` interpolation are correctly used.
- Minor stylistic note (not a technical error, left unchanged): OpenTofu also supports a `tofu.workspace` reference as an alias for `terraform.workspace`. The post uses the Terraform-compatible name, which works in OpenTofu and is appropriate given the audience.
