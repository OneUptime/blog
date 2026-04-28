# Validation Summary: How to Use for_each with Modules in OpenTofu - Foreach

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (compatible HCL syntax)
- HashiCorp Configuration Language (HCL)
- `for_each` meta-argument
- Modules

## Sources Consulted
- OpenTofu documentation — `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu documentation — Modules: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu documentation — `toset` function: https://opentofu.org/docs/language/functions/toset/
- OpenTofu documentation — Type constraints (`set`, `map`, `object`): https://opentofu.org/docs/language/expressions/type-constraints/
- Terraform documentation (equivalent semantics): https://developer.hashicorp.com/terraform/language/meta-arguments/for_each

## Issues Found
No technical issues found.

All HCL examples are syntactically valid and accurately demonstrate `for_each` behavior with modules:
- `each.key` and `each.value` semantics for both maps and sets are correct (for sets, both refer to the same string element).
- Object attribute access via `each.value.attribute_name` is correct.
- Module output access pattern `module.NAME["key"].output_attribute` is correct.
- The `for` expression over `module.database` to build an output map is valid.
- `toset(var.list)` is the canonical way to allow a list-of-strings to be used with `for_each`.
- The conclusion's claim that `for_each` produces more stable plans than `count` when elements are inserted/removed mid-list matches OpenTofu/Terraform's documented behavior.

## Review Notes
- Minor wording imprecision (left as-is, not a technical error): the section "Converting Lists to Maps for for_each" says "convert lists using `for` expressions" but the example uses `toset()` (a function, producing a set, not a map). The code is correct and the introductory sentence correctly mentions "a map or set," so the example is consistent with `for_each`'s requirement; the heading is just slightly broader than the example. Per review guidelines (no stylistic/structural changes), no edit was made.
- The example uses a list literal `["us-east-1", ...]` as the default for a `set(string)`-typed variable. OpenTofu performs the implicit conversion, so this is valid.
- The post does not call out one common gotcha: `for_each` values must be known at plan time. This is a future improvement rather than a correction.
