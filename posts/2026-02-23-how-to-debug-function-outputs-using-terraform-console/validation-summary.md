# Validation Summary: How to Debug Function Outputs Using terraform console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- `terraform console` CLI command
- Terraform built-in functions (string, regex, CIDR, JSON/YAML, type conversion, conditional, collection)
- Bash (for non-interactive console invocation examples)

## Sources Consulted
- Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- Terraform IP Network functions: https://developer.hashicorp.com/terraform/language/functions (cidrhost, cidrnetmask, cidrsubnet, cidrsubnets)
- `terraform console` CLI documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- `templatestring` function reference: https://developer.hashicorp.com/terraform/language/functions/templatestring

## Issues Found
1. **Non-existent `cidrcontains` function.** The "Testing CIDR Functions" section included two examples calling `cidrcontains(...)`. Terraform's built-in IP network functions are only `cidrhost`, `cidrnetmask`, `cidrsubnet`, and `cidrsubnets` — there is no `cidrcontains`. Replaced the two `cidrcontains` examples with a valid `cidrsubnets` example showing how to generate a sequence of subnet ranges.

2. **Incorrect `terraform console -plan=tfplan` usage.** The "Using the Console with Plan Files" section showed `terraform plan -out=tfplan` followed by `terraform console -plan=tfplan`, implying you can load a saved plan file. The actual `-plan` flag (added in Terraform 1.9) is a boolean that tells the console to generate a fresh plan and evaluate against it — it does not accept a path to a saved plan file. Rewrote the section to use `terraform console -plan` with the correct semantics, and renamed the heading from "Using the Console with Plan Files" to "Using the Console with a Plan".

3. **Inaccurate `type(["a", "b"])` output.** The console-only `type()` function returns a full type expression for compound types, not a bare keyword. `type(["a", "b"])` returns `tuple([string, string,])` (multi-line), not just `tuple`. Updated the example to show the correct multi-line output and added a small parenthetical noting `type` is a console-only function.

## Review Notes
- All other function examples (`split`, `join`, `lower`, `upper`, `trimspace`, `regex`, `format`, `cidrsubnet`, `cidrhost`, `cidrnetmask`, `jsondecode`, `jsonencode`, `yamldecode`, `tonumber`, `tostring`, `tobool`, `toset`, `coalesce`, `try`, `lookup`, `merge`, `length`) were verified as correct in name, signature, and representative output formatting.
- The `templatestring` function mentioned in passing is valid (added in Terraform 1.9).
- Non-interactive piping (`echo '...' | terraform console`) is officially supported per the documentation.
- Console output formatting (e.g. `tolist([...])` wrappers for lists returned by certain functions and `toset([...])` for sets) is consistent with current Terraform behavior.
- Output format details for some functions can vary slightly across Terraform versions; the examples shown are accurate for recent Terraform releases (1.x).
