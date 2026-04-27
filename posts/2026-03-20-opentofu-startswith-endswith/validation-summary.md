# Validation Summary: How to Use the startswith and endswith Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language built-in functions)
- Terraform (compatible — same functions)
- AWS (used in examples: S3, IAM, ACM ARNs)

## Sources Consulted
- OpenTofu `startswith` function documentation: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu `endswith` function documentation: https://opentofu.org/docs/language/functions/endswith/
- OpenTofu CLI `console` command: https://opentofu.org/docs/cli/commands/console/
- OpenTofu input variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu `for` expressions / list comprehension syntax: https://opentofu.org/docs/language/expressions/for/

## Issues Found
No technical issues found.

All technical claims are accurate:
- The syntax `startswith(string, prefix)` and `endswith(string, suffix)` matches the official OpenTofu function signatures.
- Both functions return a boolean — correct.
- Both functions are case-sensitive by default — correct.
- All example evaluations resolve to the documented results (e.g., `startswith("hello-world", "hello")` → `true`).
- The `validation` block syntax with `condition` and `error_message` is valid HCL.
- The `[for x in list : x if condition]` filtering pattern is valid HCL `for` expression syntax.
- The `tofu console` REPL invocation and `>` prompt output are correct.
- `lower()` exists in OpenTofu and the case-insensitive trick using `lower()` works as shown.

## Review Notes
- The functions were originally introduced in Terraform 1.5.0 (inherited into OpenTofu); the post does not claim a specific minimum version, which is fine for a current OpenTofu audience.
- The variable validation examples are minimal but functional. Modern OpenTofu also supports cross-variable references in validation conditions (added later), but the simple form shown is still fully supported and idiomatic.
- The case-sensitivity example is technically correct: `lower("PROD-DB")` produces `"prod-db"`, which starts with `"prod-"`, so the result is `true`.
