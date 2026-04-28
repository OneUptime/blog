# Validation Summary: How to Use the OpenTofu Functions Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference

## Technologies Covered
- OpenTofu (built-in functions)
- HCL (HashiCorp Configuration Language)
- Infrastructure as Code

## Sources Consulted
- OpenTofu function reference index: https://opentofu.org/docs/language/functions/
- contains: https://opentofu.org/docs/language/functions/contains/
- regex: https://opentofu.org/docs/language/functions/regex/
- compact: https://opentofu.org/docs/language/functions/compact/
- urlencode: https://opentofu.org/docs/language/functions/urlencode/
- formatdate: https://opentofu.org/docs/language/functions/formatdate/
- substr: https://opentofu.org/docs/language/functions/substr/
- slice: https://opentofu.org/docs/language/functions/slice/
- lookup: https://opentofu.org/docs/language/functions/lookup/
- tobool: https://opentofu.org/docs/language/functions/tobool/

## Issues Found
- **`contains()` on a map (Map Functions section)**: The original example `contains({a=1, b=2}, "a") # → true (checks key)` was incorrect. Per the official docs, `contains()` only works on lists, tuples, and sets — passing a map produces a type error, not `true`. The idiomatic way to check whether a map has a given key is `contains(keys(mymap), "a")`. Fixed by replacing the example with `contains(keys({a=1, b=2}), "a")`.

## Review Notes
- Verified all other examples against the official OpenTofu docs and they are accurate, including the subtle behaviors:
  - `regex()` with a single unnamed capture group returns a list (`["user"]`), not a bare string — matches docs.
  - `compact()` does drop both empty strings and `null` (modern OpenTofu/Terraform behavior).
  - `urlencode()` encodes spaces as `+` (form-style), matching Go's `url.QueryEscape`.
  - `formatdate("YYYY-MM-DD", ...)` uses valid token spellings.
  - `slice(list, start, end)` is start-inclusive, end-exclusive.
- The `contains(["a","b","c"], "b") # → true (for strings)` comment in the String Functions section is slightly awkward phrasing (the function works on any list, not just strings of strings) but is not technically wrong, so it was left as-is per the "fix only technical errors" guidance.
- Function set is current as of OpenTofu 1.x; no deprecated functions are referenced.
