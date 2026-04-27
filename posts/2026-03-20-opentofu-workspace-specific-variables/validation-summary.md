# Validation Summary: How to Use Workspace-Specific Variable Values in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI, workspaces, HCL)
- Terraform (compatible patterns)
- HCL language constructs (`locals`, `variable`, `coalesce`, map indexing)
- Bash (command substitution in apply commands)
- GitHub Actions (CI/CD integration)
- AWS resources (referenced as examples: `aws_launch_template`, `aws_cloudfront_distribution`)

## Sources Consulted
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `tofu workspace select` command: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu `coalesce` function: https://opentofu.org/docs/language/functions/coalesce/
- OpenTofu environment variables (TF_VAR_): https://opentofu.org/docs/cli/config/environment-variables/#tf_var_name
- OpenTofu HCL expressions: https://opentofu.org/docs/language/expressions/references/
- GitHub Actions expressions documentation: https://docs.github.com/en/actions/learn-github-actions/expressions

## Issues Found
1. **Pattern 2 — invalid bash syntax in `tofu apply` command**
   - Original: `tofu apply -var-file="environments/${$(tofu workspace show)}.tfvars"`
   - Problem: `${$(...)}` is not valid bash. The `${...}` form expects a parameter name, not a command substitution. The construct as written will produce a "bad substitution" error.
   - Fix: Changed to `tofu apply -var-file="environments/$(tofu workspace show).tfvars"`, which is the correct command-substitution form.

## Review Notes
- `terraform.workspace` is the correct built-in expression in OpenTofu (kept under the `terraform.` namespace for compatibility); `tofu.workspace` is not introduced as a replacement.
- The `-or-create` flag on `tofu workspace select` is valid in OpenTofu (inherited from Terraform 0.15+).
- `coalesce(var.instance_type, local.default_instance_types[terraform.workspace])` works correctly when `var.instance_type = null` because `coalesce` skips null/empty values.
- The GitHub Actions ternary pattern `${{ X && 'a' || 'b' }}` is a documented idiom and works because the truthy branch (`'production'`) is itself truthy. Worth noting that this pattern silently fails when the "true" value is falsy (empty string, 0, false), but that's not a concern with the values used here.
- The Pattern 4 example uses `default = null`, which requires OpenTofu/Terraform 0.12+ to declare nullable variables explicitly; this is fine for any modern OpenTofu.
- The conclusion mentions using a precondition to validate `terraform.workspace`, which is good practice but not demonstrated in the post — could be added as a future improvement.
