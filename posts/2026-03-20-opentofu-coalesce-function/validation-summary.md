# Validation Summary: How to Use the coalesce Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language functions)
- Terraform-compatible HCL syntax
- AWS provider (aws_ami data source, aws_ssm_parameter data source) used in examples

## Sources Consulted
- Official OpenTofu documentation for the `coalesce` function: https://opentofu.org/docs/language/functions/coalesce/
- OpenTofu CLI documentation for the `tofu console` command
- Terraform/OpenTofu `lookup` function documentation for the comparison table

## Issues Found
No technical issues found.

The post accurately describes the behavior of `coalesce`:
- Returns the first non-null, non-empty-string argument (matches official docs).
- All examples produce the stated outputs (`coalesce(null, "", "hello")` → `"hello"`, `coalesce("first", "second")` → `"first"`).
- The `tofu console` REPL command exists and works as shown.
- The HCL syntax in all configuration snippets is valid (variable, locals, data, lookup function).
- The `data.aws_ssm_parameter.db_host.value` attribute reference is correct for the AWS SSM parameter data source.
- The `coalesce` vs `try` vs `lookup` comparison table is accurate.
- The qualifier "similar to" SQL's `COALESCE` is appropriate, since OpenTofu's version also treats empty strings as falsy whereas SQL's only checks for NULL.

## Review Notes
- Minor caveat (not an error): the official OpenTofu docs note that `coalesce` performs automatic type conversion across mixed-type arguments (e.g., `coalesce(1, "hello")` returns `"1"`). The post sticks to single-type examples, which is the safer/clearer pattern, so this is fine.
- Users handling sensitive SSM values may want `aws_ssm_parameter`'s `value` attribute marked sensitive — out of scope for a `coalesce` tutorial, but worth noting in a future security-focused post.
