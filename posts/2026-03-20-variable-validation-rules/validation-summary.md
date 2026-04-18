# Validation Summary: How to Use Variable Validation Rules in OpenTofu - Rules

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu
- Terraform (HCL language, compatible syntax)
- Variable validation blocks
- Built-in functions: `contains`, `length`, `can`, `regex`, `cidrhost`
- Resource preconditions (brief mention)

## Sources Consulted
- [OpenTofu - Input Variables](https://opentofu.org/docs/language/values/variables/)
- [OpenTofu - Custom Conditions](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu - cidrhost function](https://opentofu.org/docs/language/functions/cidrhost/)
- [OpenTofu - Checks](https://opentofu.org/docs/language/checks/)
- [OpenTofu GitHub issue #1336 - Allow Variable Validation Conditions to Refer to Other Variables](https://github.com/opentofu/opentofu/issues/1336)
- [OpenTofu GitHub issue #2813 - Cross variable validation not working](https://github.com/opentofu/opentofu/issues/2813)

## Issues Found
No technical issues found.

Verified claims:
- `validation` blocks are valid inside `variable` declarations in OpenTofu — correct.
- Variable validation conditions can only reference the variable being validated (`var.<name>`) and cannot cross-reference other variables — confirmed still true in current OpenTofu; the feature request (#1336) remains open.
- Multiple `validation` blocks per variable are evaluated independently — correct.
- `contains()`, `length()`, `can()`, `regex()`, `cidrhost()` all behave as described.
- The subdomain regex `^[a-z][a-z0-9-]{1,61}[a-z0-9]$` correctly yields 3–63 character strings matching the described constraints.
- CIDR validation via `can(cidrhost(var.vpc_cidr, 0))` is the idiomatic pattern and relies on `cidrhost` erroring on malformed input, which `can()` catches.
- Preconditions having access to resource attributes vs. validation running before resources exist — correct distinction.

## Review Notes
- The "null_resource trick" mention for cross-variable validation is a valid but somewhat dated workaround. Modern OpenTofu also supports `check` blocks and `terraform_data` with `lifecycle.precondition` for the same pattern. Not a correctness issue.
- The mocked error-output block uses illustrative box-drawing characters and is not a verbatim match for OpenTofu's exact CLI output format, but it conveys the right semantics (filename, line number, variable value, error message). Left as-is since it is representative rather than a command the reader runs verbatim.
- The subdomain example's error message lists allowed characters without emphasizing that hyphens cannot be leading or trailing; the regex enforces this, but the message could be clearer. Not technically wrong.
