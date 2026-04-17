# Validation Summary: How to Use Workspace-Specific Variable Values in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (tofu CLI)
- Terraform / HCL language
- `.tfvars` files
- OpenTofu built-in functions: `lookup()`, `try()`, `merge()`, `contains()`, `tobool()`, `join()`
- `terraform.workspace` reference expression
- `check` blocks (Terraform 1.5+ / OpenTofu 1.6+)
- AWS provider resources used illustratively (`aws_instance`, `aws_db_instance`)

## Sources Consulted
- OpenTofu CLI documentation - workspace commands: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu CLI - `tofu apply` and `-var-file`: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu language reference - `terraform.workspace`: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu functions - `lookup`: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu functions - `try`: https://opentofu.org/docs/language/functions/try/
- OpenTofu functions - `merge`: https://opentofu.org/docs/language/functions/merge/
- OpenTofu functions - `tobool`: https://opentofu.org/docs/language/functions/tobool/
- OpenTofu `check` blocks: https://opentofu.org/docs/language/checks/
- Terraform `check` blocks (introduced v1.5): https://developer.hashicorp.com/terraform/language/checks

## Issues Found
- Pattern 2 Locals Map: The code comment read `# Get current workspace config (with fallback)` but the line `local.env_config[terraform.workspace]` has no fallback - it raises an error if the workspace key is missing. Removed "(with fallback)" from the comment so it matches the code. The subsequent `lookup()` pattern is where fallback behavior is actually demonstrated.

## Review Notes
- All OpenTofu CLI commands (`tofu workspace select`, `tofu apply -var-file=...`) are syntactically correct and reflect current behavior.
- The use of `terraform.workspace` (rather than an `opentofu.*` alias) is intentional and correct: OpenTofu preserves this reference for compatibility with the Terraform language.
- The `tobool("ERROR: ...")` trick in the "Workspace Variable Validation" section is a well-known Terraform/OpenTofu hack that works because `tobool` errors on any string that is not `"true"` or `"false"`, and the offending string appears in the resulting error message. The error wording the user actually sees is wrapped in OpenTofu's standard conversion error, so the custom text will appear inside a larger diagnostic. The modern alternative shown in the next section (`check` blocks) is cleaner, and post-1.9 OpenTofu variable `validation` blocks that reference other locals/variables would be another option to consider mentioning in a future revision.
- `check` blocks with `assert` are correctly written and are supported in OpenTofu 1.6+ (and Terraform 1.5+). They produce warnings rather than hard failures, which is an important distinction worth noting if the intent is to block apply on invalid workspace names - for hard failures, a `precondition` on a resource/data source or the `tobool` approach is needed.
- HCL snippets (locals maps, `merge`, ternaries, resource blocks) are syntactically valid.
