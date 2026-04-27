# Validation Summary: How to Switch Between Workspaces in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform (compatible workflow)
- HCL (configuration language, `terraform.workspace` expression)
- AWS provider (`aws_s3_bucket` example)
- Bash scripting (CI/CD examples)
- Infrastructure as Code

## Sources Consulted
- OpenTofu `tofu workspace select` documentation: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu `tofu workspace show` documentation: https://opentofu.org/docs/cli/commands/workspace/show/
- OpenTofu `tofu workspace list` documentation: https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu Workspaces CLI overview: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `terraform.workspace` expression reference (CLI workspaces): https://opentofu.org/docs/language/state/workspaces/#current-workspace-interpolation

## Issues Found
No technical issues found.

All claims and examples were verified against the official OpenTofu documentation:
- `tofu workspace select <name>` switches the active workspace and the state file used by subsequent operations.
- The `-or-create` flag for `tofu workspace select` (creates the workspace if it does not exist) is supported in OpenTofu (carried over from Terraform 1.4+ behavior).
- `tofu workspace list` prints all workspaces and marks the active one with `*`, matching the example output.
- `tofu workspace show` prints only the current workspace name, suitable for capturing in a shell variable.
- `${terraform.workspace}` is the correct expression for referencing the currently selected workspace name in HCL (OpenTofu intentionally preserves the `terraform.*` namespace for compatibility).
- `tofu apply -auto-approve` and `tofu apply -var-file=...` flags are valid and current.

## Review Notes
- `tofu workspace select` only switches the local state pointer; users on remote backends (e.g., S3 with workspace key prefixing, Terraform Cloud) should be aware that workspace semantics can differ slightly per backend, but the post's general guidance still applies.
- The "OpenTofu v1.x supports creating a workspace if it doesn't exist" wording is accurate; `-or-create` has been available since the earliest OpenTofu releases (and Terraform 1.4).
- The post correctly notes that configuration files are shared and only state changes when switching workspaces — this is the canonical OpenTofu/Terraform CLI workspaces model.
