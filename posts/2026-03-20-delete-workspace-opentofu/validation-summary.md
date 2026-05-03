# Validation Summary: How to Delete a Workspace in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI workspace commands)
- Terraform-compatible workspace state management
- S3 backend (state file organization with `workspace_key_prefix`)
- Local backend (`terraform.tfstate.d` directory)
- GCS backend (workspace state objects)
- Bash scripting for automation

## Sources Consulted
- OpenTofu CLI workspace delete docs: https://opentofu.org/docs/cli/commands/workspace/delete/
- OpenTofu workspace_delete source: https://github.com/opentofu/opentofu/blob/main/internal/command/workspace_delete.go
- OpenTofu workspace view source (success message format): https://github.com/opentofu/opentofu/blob/main/internal/command/views/workspace.go
- OpenTofu S3 backend docs (workspace_key_prefix default): https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Local backend docs: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu workspaces overview: https://opentofu.org/docs/language/state/workspaces/

## Issues Found
No technical issues found.

Verified specifically:
- `tofu workspace delete <name>` syntax is correct.
- `-force` flag (single dash) is the correct flag, and the description (allow deletion of a workspace tracking resources, leaving them orphaned) matches the official docs.
- Prerequisites listed (workspace must exist, must not be active, must be empty unless `-force`) match the official documentation.
- Success output `Deleted workspace "dev-feature-x"!` matches the format string in `views/workspace.go` (`Deleted workspace %q!`).
- The error wording for deleting a non-empty workspace is paraphrased but conveys the correct condition and remediation (use `-force`).
- S3 backend path `s3://my-state-bucket/env:/dev-feature-x/terraform.tfstate` is correct: `workspace_key_prefix` defaults to `env:`, and non-default workspace state is stored at `<bucket>/<workspace_key_prefix>/<workspace_name>/<key>`.
- Local backend path `terraform.tfstate.d/dev-feature-x/` matches the well-known per-workspace directory layout.
- GCS backend example `gs://my-state-bucket/prod/dev-feature-x.tfstate` is consistent with the `<prefix>/<workspace>.tfstate` layout (assuming `prod` is the configured prefix).
- Bash script logic is sound: it switches into the target workspace to inspect/destroy state, switches back to `default` before deletion, and refuses to delete `default`.

## Review Notes
- The error message text shown in "Deleting a Workspace with Remaining State" is a paraphrase of the actual OpenTofu error (the real message lists the resource instances tracked and references "Use the -force option to disable this safety check"). The paraphrase is technically accurate in intent and keeps the example readable; left as-is.
- `tofu destroy -var-file=dev.tfvars` is shown without `-auto-approve`; this will prompt interactively, which is appropriate for a guided tutorial. The automation script later uses `-auto-approve`, which is correct for unattended scripts.
- The "Preventing Accidental Deletion" snippet calls `tofu workspace select "$ws"` then later `tofu workspace select default` without restoring the original workspace; this is fine for a CI gate but worth noting if reused inside a developer's interactive shell.
