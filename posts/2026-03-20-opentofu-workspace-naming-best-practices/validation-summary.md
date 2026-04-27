# Validation Summary: How to Name Workspaces Following Best Practices in OpenTofu

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform-compatible HCL
- Terraform workspaces
- HCL custom conditions (preconditions)
- Bash / shell scripting (CI/CD automation)
- AWS resources (S3, EKS) used as illustrative examples

## Sources Consulted
- OpenTofu CLI workspace select docs: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu CLI workspace new docs: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu custom conditions docs: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `terraform.workspace` named value reference

## Issues Found
No technical issues found.

Specifically verified:
- `tofu workspace new <name>` is the correct command for creating a workspace.
- `tofu workspace select -or-create "$WORKSPACE"` is valid syntax — the `-or-create` flag is documented and creates the workspace if it does not already exist.
- `terraform.workspace` is the correct named value to access the current workspace name in HCL (used by both Terraform and OpenTofu).
- `precondition` blocks inside a resource `lifecycle` block (including on `null_resource`) are supported, with `condition` and `error_message` arguments.
- `null_resource` from the `hashicorp/null` provider is compatible with OpenTofu.
- The bash sanitization snippets (`tr`, `sed`) are syntactically valid.
- Workspace naming guidance (lowercase, hyphens, avoid spaces/uppercase/underscores) reflects accepted community conventions; it is presented as best practice rather than as enforced syntax, which is accurate.

## Review Notes
- The `-or-create` flag for `tofu workspace select` requires a reasonably modern OpenTofu version; users on very old releases would need to use `tofu workspace new` followed by `tofu workspace select`. This is not a defect — modern OpenTofu releases support the flag — but is worth noting for readers on legacy installations.
- The author URL uses `https://www.github.com/...`; GitHub canonicalizes this to `https://github.com/...`. Functional, not a technical error.
- The `null_resource` precondition pattern works but is only evaluated during plan/apply against that resource. Some teams prefer `terraform_data` (newer alternative) instead of `null_resource`, but `null_resource` remains valid and widely used.
