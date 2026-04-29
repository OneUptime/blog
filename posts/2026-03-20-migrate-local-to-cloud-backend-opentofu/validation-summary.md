# Validation Summary: How to Migrate from Local Backend to Cloud Backend in OpenTofu

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform Cloud / HCP Terraform
- HCL `terraform { cloud {} }` block configuration
- Terraform Cloud Workspaces API (v2)
- Local, S3, GCS, and Azure Blob backends
- Bash scripting (workspace iteration, sed-based config edits)

## Sources Consulted
- OpenTofu — Backend Configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu — Cloud Block (`tf-cloud`): https://opentofu.org/docs/language/settings/tf-cloud/
- OpenTofu — `tofu init` command reference: https://opentofu.org/docs/cli/commands/init/
- HashiCorp — Terraform Cloud Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces

## Issues Found
No technical issues found.

Verified specifically:
- The `cloud` block in OpenTofu accepts `organization` and a nested `workspaces { name = ... }` (single workspace) or `workspaces { tags = [...] }` (multi-workspace) configuration. The post's single-workspace example is valid.
- `tofu init -migrate-state -force-copy` flags are valid; `-migrate-state` copies state to the new backend and `-force-copy` auto-confirms the prompts (and implies `-migrate-state`).
- The Terraform Cloud Workspaces API endpoint (`POST /api/v2/organizations/:org/workspaces`), the `application/vnd.api+json` content type, and the body attributes used (`name`, `description`, `terraform-version`, `execution-mode`, `auto-apply`) are all valid. `execution-mode` accepts `remote`, `local`, or `agent` — `local` is valid.
- `tofu login`, `tofu state list`, `tofu plan`, `tofu show`, `tofu workspace select`, and `tofu workspace new` are all valid OpenTofu CLI commands.
- The migration prompt and output text shown after `tofu init` are representative of the actual CLI behavior when switching backends.
- The Bash backup/restore patterns (including the `2>/dev/null || true` guard) are syntactically and semantically correct.

## Review Notes
- The "Handling Multiple State Files" script uses `workspaces { name = ... }` and rewrites it per workspace via `sed`. This works, but the more idiomatic approach for migrating multiple CLI workspaces in one shot is `workspaces { tags = [...] }` in the cloud block, which lets OpenTofu create one cloud workspace per tagged CLI workspace during a single `tofu init -migrate-state`. The post's per-workspace approach is not wrong; it's just an alternative.
- The post sets `execution-mode: local` when creating the workspace via API. This is a reasonable choice for OpenTofu users running against Terraform Cloud, since HCP Terraform's remote execution runs HashiCorp Terraform binaries (not OpenTofu). For users wanting remote execution, OpenTofu is best paired with a fully OpenTofu-aware backend (e.g., self-hosted state backends or Scalr/Spacelift) rather than HCP Terraform.
- The hardcoded date `terraform.tfstate.backup-20240101` in the rollback section is illustrative; readers should substitute the actual backup filename created earlier.
- Compatibility caveat (not an error in the post): HCP Terraform's terms of service govern third-party clients; OpenTofu can connect to it via the `cloud` block today, but readers operating in regulated environments may want to confirm acceptable use.
