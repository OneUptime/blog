# Validation Summary: How to Delete a Workspace in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (referenced/related)
- OpenTofu workspaces and state management
- Local backend (filesystem state storage)
- S3 backend (remote state storage)
- Bash scripting

## Sources Consulted
- OpenTofu `workspace delete` command documentation: https://opentofu.org/docs/cli/commands/workspace/delete/
- OpenTofu source code for the workspace delete command: `internal/command/workspace_delete.go` (https://github.com/opentofu/opentofu/blob/main/internal/command/workspace_delete.go)
- OpenTofu source code for the workspace views (success/error messages): `internal/command/views/workspace.go`
- OpenTofu source code for the local backend (default workspace deletion check): `internal/backend/local/backend.go`
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
1. **Incorrect S3 backend state path format.** The post originally showed `s3://bucket/prefix/env:/old-feature/terraform.tfstate` for the workspace state object. According to the official S3 backend docs, the path format for a non-default workspace is `<workspace_key_prefix>/<workspace_name>/<key>`, with `workspace_key_prefix` defaulting to `env:`. The "prefix/" segment appearing *before* `env:` was incorrect and inconsistent with how the S3 backend constructs object keys. Updated the example to `s3://bucket/env:/old-feature/terraform.tfstate`, which matches the standard default layout.

## Review Notes
- The success output `Deleted workspace "old-feature"!` matches the exact message produced by OpenTofu's `WorkspaceDeleted` view (`Deleted workspace %q!`).
- The error messages illustrated in the post (for deleting the active workspace and the default workspace) are paraphrased rather than verbatim. The actual messages are:
  - Active workspace: `Workspace "<name>" is your active workspace` / `You cannot delete the currently active workspace. Please switch to another workspace and try again.`
  - Default workspace: `cannot delete default state` (raised by the local backend's `DeleteWorkspace`).
  
  These approximations are acceptable for an illustrative tutorial — they convey the correct behavior — but readers should not expect the exact strings to match in a programmatic check.
- The `-force` flag is correctly described and is still a supported flag on `tofu workspace delete` as of the current OpenTofu release.
- The local backend state directory layout (`terraform.tfstate.d/<workspace>/`) is accurate.
- The deletion workflow (select target → destroy → switch to default → delete) is the recommended pattern and aligns with OpenTofu best practices.
- The batch deletion loop is functional Bash; the `2>/dev/null || continue` pattern correctly skips missing workspaces.
