# Validation Summary: How to Pass Workspace-Specific Variables in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (`tofu` CLI)
- HCL (HashiCorp Configuration Language)
- Terraform/OpenTofu workspaces
- `.tfvars` variable files
- `TF_VAR_*` environment variables
- Bash scripting (for CI automation)
- AWS (EC2, RDS references in examples)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu `apply` command and `-var-file` flag: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu input variables (including `TF_VAR_` env vars): https://opentofu.org/docs/language/values/variables/
- OpenTofu locals and `terraform.workspace` reference: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `lookup` function: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu variable validation blocks and `can`/`regex` functions: https://opentofu.org/docs/language/expressions/custom-conditions/

## Issues Found
No technical issues found.

All commands (`tofu workspace show`, `tofu workspace select`, `tofu workspace new`, `tofu apply -var-file=...`, `-auto-approve`) are correct and current. The HCL syntax for locals, `lookup(...)`, the `validation` block with `can(regex(...))`, and variable default/type declarations is valid. The `TF_VAR_<name>` environment variable convention is accurate. The `terraform.workspace` reference remains supported in OpenTofu for compatibility.

## Review Notes
- OpenTofu 1.8+ also exposes `tofu.workspace` as an alias to `terraform.workspace`. The post uses `terraform.workspace`, which still works across all current OpenTofu versions; using either is acceptable.
- The `lookup(local.env_vars, terraform.workspace, local.env_vars["staging"])` pattern is idiomatic and correct. Newer style sometimes prefers `try(local.env_vars[terraform.workspace], local.env_vars["staging"])`, but both are valid.
- The alignment of `enable_deletion_protection` in the locals map is slightly uneven compared to other keys, but this is cosmetic and not a technical issue.
