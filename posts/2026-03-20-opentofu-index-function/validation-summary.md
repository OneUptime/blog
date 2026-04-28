# Validation Summary: How to Use the index Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (HCL language built-in `index` function)
- Terraform (compatible syntax)
- AWS provider (used in subnet CIDR example with `aws_subnet`)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/language/functions/index_function/
- OpenTofu `element` function (for inverse comparison): https://opentofu.org/docs/language/functions/element/
- OpenTofu `try` function: https://opentofu.org/docs/language/functions/try/
- OpenTofu `for_each` and `toset` semantics: https://opentofu.org/docs/language/meta-arguments/for_each/

## Issues Found
No technical issues found.

## Review Notes
- The claim that `index` is the "inverse of `element`" is accurate: `element(list, n)` returns the value at position `n`, while `index(list, v)` returns the position of value `v`. Note that `element` wraps with modulo while `index` errors on missing values, so they are not perfect inverses across all inputs — but the framing in the post is appropriate for the typical use case.
- The Subnet CIDR example uses `for_each = toset(var.az_list)` and then calls `index(var.az_list, each.key)` to recover an ordered position. This works because `index` is called against the original ordered list (not the unordered set). It is a valid pattern but worth noting that it depends on `var.az_list` retaining its declared order; if the list were reordered between plans, the CIDR assignments would shift. This is a known gotcha but not a technical error in the post.
- The `t3.*` monthly cost figures (8.47, 16.94, 33.89, 67.77 USD) are illustrative example values; actual AWS pricing varies by region and over time. They are presented as example variable defaults, not as authoritative pricing claims.
- All HCL syntax, function signatures, and CLI usage (`tofu console`) are correct as of OpenTofu 1.x.
