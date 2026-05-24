# Validation Summary: How to Fix Terraform Function Argument Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform built-in functions: `join`, `lookup`, `length`, `element`, `max`, `min`, `tonumber`, `coalesce`, `coalescelist`, `regex`, `regexall`, `try`, `can`, `format`, `formatlist`, `cidrsubnet`, `cidrhost`, `file`, `fileexists`, `replace`, `flatten`, `split`, `distinct`
- Splat expressions
- AWS provider resources (used as examples: `aws_instance`)

## Sources Consulted
- Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- `join`: https://developer.hashicorp.com/terraform/language/functions/join
- `lookup`: https://developer.hashicorp.com/terraform/language/functions/lookup
- `replace`: https://developer.hashicorp.com/terraform/language/functions/replace
- `cidrhost`: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- `cidrsubnet`: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- `flatten`: https://developer.hashicorp.com/terraform/language/functions/flatten
- `coalesce`: https://developer.hashicorp.com/terraform/language/functions/coalesce
- `try` / `can`: https://developer.hashicorp.com/terraform/language/functions/try
- Splat expressions: https://developer.hashicorp.com/terraform/language/expressions/splat

## Issues Found
1. **`cidrhost()` example reasoning was inaccurate.** The comment said "only 254 usable hosts" to explain why `cidrhost("10.0.1.0/24", 300)` fails. While requesting 300 does fail, the actual reason is that the valid `hostnum` range for a /24 is 0–255 (the function does not enforce networking conventions that reserve network/broadcast addresses). Updated to "valid range is 0-255" and adjusted the surrounding comment to "netnum must fit in the host bits of the prefix" for accuracy.

2. **`replace()` quick-reference entry was incorrect.** The cheat-sheet row said "Forgetting it uses regex by default" — this is the inverse of the actual behavior. Per Terraform docs, `replace()` performs a literal string replacement by default, and only treats `substring` as a regular expression when it is wrapped in forward slashes (e.g., `/pattern/`). Changed the common-mistake column to "Expecting regex by default (wrap substr in `/.../` for regex)".

3. **`flatten()` quick-reference entry was misleading.** The "common mistake" of "Passing a non-nested list" is not a mistake at all — `flatten()` simply returns a flat list unchanged. Replaced with a real common mistake: "Expecting it to deduplicate (use `distinct()` instead)".

## Review Notes
- The `lookup()` function is correctly described as taking 2 or 3 arguments, but the 2-argument form has been deprecated since Terraform 0.7. Always providing a default (the 3-argument form) is best practice. Not a correction-worthy issue for this post, but worth noting for future updates.
- The `join` parameter name shown in the example error message ("missing value for 'lists' parameter") matches Terraform's internal parameter naming (the function's variadic parameter is named `lists` in the source), so the error text is accurate.
- The `cidrsubnet("10.0.0.0/16", 8, 1)` example was verified to produce "10.0.1.0/24" — correct.
- All other code examples (regex escaping, `try`/`can` patterns, splat expressions, `path.module` usage, `format` verbs) are accurate and idiomatic.
