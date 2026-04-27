# Validation Summary: How to Use the regexall Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Function Reference

## Technologies Covered
- OpenTofu (`regexall`, `regex`, `tonumber`, `length` functions)
- HCL (HashiCorp Configuration Language)
- Regular expressions
- `tofu console` CLI

## Sources Consulted
- OpenTofu `regexall` function documentation: https://opentofu.org/docs/language/functions/regexall/
- OpenTofu `regex` function documentation: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `tofu console` command documentation

## Issues Found
No technical issues found.

All technical claims in the post were verified against the official OpenTofu documentation:
- `regexall(pattern, string)` returns a list of all matches — confirmed.
- Returns `[]` (empty list) when no match is found, rather than erroring like `regex` — confirmed.
- With no capture groups: returns a list of strings — confirmed.
- With unnamed capture groups: returns a list of lists (tuples) — confirmed. The `[["a", "1"], ["b", "2"], ["c", "3"]]` example output is correct.
- With a single unnamed capture group like `regexall("port=([0-9]+)", ...)`: each match is still a single-element list, so the `m[0]` access pattern in the for-expression is correct.
- The two-capture-group tag pairs example returning lists where `pair[0]` and `pair[1]` access the named/unnamed groups is correct.
- `tofu console` is a valid OpenTofu command for interactively evaluating expressions.
- The `regexall` vs `regex` comparison table is accurate.

## Review Notes
None.
