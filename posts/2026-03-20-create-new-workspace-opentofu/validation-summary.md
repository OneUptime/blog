# Validation Summary: How to Create a New Workspace in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (workspace subcommand)
- Terraform-compatible HCL configuration language
- AWS provider (`aws_instance`) used in example
- S3 remote backend (workspace state key layout)
- Bash (shell examples and loops)

## Sources Consulted
- OpenTofu CLI docs — workspace commands: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu — `workspace new`: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu — `workspace list`: https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu — `workspace select`: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu — `workspace show`: https://opentofu.org/docs/cli/commands/workspace/show/
- OpenTofu — state pull/push: https://opentofu.org/docs/cli/commands/state/pull/ and https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu — `terraform.workspace` reference / language expressions: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu — S3 backend (`workspace_key_prefix` defaults to `env:`): https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
No technical issues found. A previous edit had already corrected the `tofu workspace list` output to show alphabetical ordering and include the always-present `default` workspace, which matches actual CLI behavior.

The verified items include:
- `tofu workspace new <name>` creates and auto-switches to the new workspace — correct.
- The shown output message (`Created and switched to workspace "..."!` ... `if you run "tofu plan" OpenTofu will not see any existing state`) matches the OpenTofu CLI wording.
- `tofu workspace list` lists workspaces alphabetically with `*` marking the current one and `default` always present.
- `terraform.workspace` is the supported reference in HCL for the current workspace name (kept for compatibility in OpenTofu).
- S3 backend layout `env:/<workspace>/<key>` for non-default workspaces and bare `<key>` for default — correct given the default `workspace_key_prefix = "env:"`.
- `tofu state pull` writes state to stdout and `tofu state push` reads from a file — correct.

## Review Notes
- `terraform.workspace` is still the canonical reference in OpenTofu (it intentionally retains compatibility with the Terraform language). Using it is correct; no change needed.
- Copying state with `state pull`/`state push` between workspaces will create resources whose ownership is now duplicated across two workspaces. The post's brief example is technically valid, but readers should be aware that in production they typically want to either remove resources from the source workspace's state or treat one of the workspaces as the new owner to avoid both workspaces trying to manage the same real infrastructure.
- The `for` loop example will print `Created workspace: $env` even if `tofu workspace new` fails (no error check). This is fine for a tutorial; not a technical inaccuracy.
