# Validation Summary: How to Use for_each with Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL — HashiCorp Configuration Language)
- Infrastructure as Code (modules, `for_each` meta-argument)

## Sources Consulted
- OpenTofu official documentation — `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu official documentation — Modules: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu official documentation — `toset` function: https://opentofu.org/docs/language/functions/toset/
- Terraform documentation (equivalent reference) — `for_each` for modules (introduced in Terraform 0.13)
- OpenTofu documentation on `for` expressions: https://opentofu.org/docs/language/expressions/for/

## Issues Found
No technical issues found.

All code examples use correct HCL syntax and current, non-deprecated APIs:
- `for_each` is supported with modules in OpenTofu (and Terraform 0.13+).
- `each.key` and `each.value` are the correct iteration variables.
- `toset(["dev", "staging", "prod"])` correctly converts a list of strings to a set.
- `map(object({...}))` variable type declaration is correct.
- Output access patterns (`module.app_cluster["prod"].endpoint` and the `for` expression `{ for k, v in module.app_cluster : k => v.endpoint }`) are syntactically valid.
- State address format `module.name["key"]` is accurate.
- The comparison with `count` (numeric, unstable on middle-of-list mutations) vs. `for_each` (stable string keys) is accurate.

## Review Notes
- The "Important Notes" bullet says "`for_each` values must be known at plan time." More precisely, it is the *keys* of the map (or all values in a set of strings) that must be known at plan time. The simplification is acceptable for an introductory tutorial but could be tightened in a future revision.
- The post does not specify a minimum OpenTofu version. `for_each` for modules is available in all current OpenTofu releases (and Terraform 0.13+), so this is not an issue, but a version note could help readers maintaining older infrastructure.
- The "Adding and Removing Instances" example uses `{ ... }` placeholders intentionally for brevity; this is a documentation convention rather than valid HCL. A reader copy-pasting would need to fill in the object literals — clear enough from context.
