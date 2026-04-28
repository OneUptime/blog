# Validation Summary: How to Use the OpenTofu Expression Syntax Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL)
- HCL (HashiCorp Configuration Language) expressions
- HCL operators, conditionals, for expressions, splat expressions
- HCL template strings and template directives
- Built-in functions: `coalesce`, `formatdate`, `timestamp`, `flatten`, `can`, `try`, `one`, `regex`, `upper`, `length`, `lower`, `trimspace`

## Sources Consulted
- OpenTofu Expressions overview: https://opentofu.org/docs/language/expressions/
- OpenTofu References: https://opentofu.org/docs/language/expressions/references/
- OpenTofu Splat expressions: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu For expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu Strings & Templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu Conditional expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu function `one`: https://opentofu.org/docs/language/functions/one/
- OpenTofu function `coalesce`: https://opentofu.org/docs/language/functions/coalesce/
- OpenTofu function `formatdate`: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu function `try`: https://opentofu.org/docs/language/functions/try/
- OpenTofu function `can`: https://opentofu.org/docs/language/functions/can/

## Issues Found

1. **Splat section labels were inverted/incorrect.** The post labeled `aws_instance.web[*].id` as "Legacy splat (*)" and `aws_subnet.private[*].availability_zone[0]` as "Full splat ([*])". In OpenTofu/HCL, the `[*]` form is the modern (full) splat, and the legacy attribute-only splat is `.*` (e.g. `aws_instance.web.*.id`). I rewrote the section so the labels match the actual syntax, kept the `[*]` examples as the modern splat, and added a small `legacy_arns` example using `.*` to illustrate the legacy form.

2. **Buggy splat-with-trailing-index example.** The expression `aws_subnet.private[*].availability_zone[0]` does not return the first availability zone in the list — with the modern `[*]` splat, trailing index operations are projected per-element, so this would attempt to index character `[0]` of each AZ string. I replaced it with `all_azs = aws_subnet.private[*].availability_zone`, which is the correct splat usage to produce a list of AZs.

3. **`one()` comment was inaccurate.** The comment said "errors if != 1 element". Per the OpenTofu docs, `one()` returns `null` for a 0-element collection, the single value for a 1-element collection, and only errors when there are 2+ elements. Updated comment to "null if 0, errors if > 1" and the lead-in to "expect at most one element".

4. **Unescaped inner quotes in template directive example.** The line `"%{ if var.environment == "prod" }PRODUCTION%{ else }NON-PROD%{ endif }"` has unescaped double quotes inside a double-quoted template string, which terminates the string prematurely and is invalid. Fixed by escaping the inner quotes (`\"prod\"`), matching the pattern used in OpenTofu's own template-directive documentation.

## Review Notes
- The `coalesce()` function is described as "Null coalescing", which is an informal but common label. Strictly, `coalesce` returns the first argument that is neither null nor an empty string (per the docs), so it differs slightly from a pure null-coalescing operator. Left as written — the example itself is correct and the framing is conventional.
- `path.cwd` is correctly described, but the OpenTofu docs recommend `path.root` or `path.module` over `path.cwd` for portability across `-chdir` and remote-execution contexts. Not a correctness issue, just a soft best-practice caveat worth keeping in mind.
- The `for` directive example `"%{~ for name in var.names ~}${name},%{~ endfor ~}"` is syntactically valid but produces a trailing comma; this is a stylistic issue, not a technical error, and matches the kind of pattern shown in official docs.
- The post is accurate against current OpenTofu (1.x) documentation. No version-specific caveats apply beyond the splat-form distinction noted above.
