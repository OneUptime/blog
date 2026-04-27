# Validation Summary: How to Use the regex Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (`regex` and `regexall` functions)
- HCL (HashiCorp Configuration Language)
- RE2 regular expression syntax
- `tofu console` REPL

## Sources Consulted
- OpenTofu `regex` function docs: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `regexall` function docs: https://opentofu.org/docs/language/functions/regexall/
- RE2 syntax reference: https://github.com/google/re2/wiki/Syntax

## Issues Found
- In the "Step-by-Step Usage" section, the example output for the named-capture call `regex("(?P<key>[a-z]+)=(?P<val>[0-9]+)", "size=100")` was shown as `{key = "key", val = "100"}`. The first value was incorrect — named-capture maps use the group names as keys and the matched substrings as values, so for input `"size=100"` the output should be `{key = "size", val = "100"}`. Corrected the value, and removed a trailing author-note artifact (`# Wait, named captures return map`) that was left in the snippet.

## Review Notes
- Return-type behavior is accurately described: a string when there are no capture groups, a list of strings for unnamed groups, and a map of strings for named groups (matches OpenTofu's documented behavior).
- The RE2 caveats listed (no lookahead/lookbehind, no backreferences, `(?P<name>...)` for named groups) are correct.
- The greedy semantics of `^(.+):(.+)$` against `"myregistry.com/app:v1.2.3"` work as the post implies because `.+` is greedy and the final `:` is consumed by the literal in the pattern, leaving `v1.2.3` as the second capture.
- The ARN parsing example correctly demonstrates that `[^:]*` allows the empty region segment in an IAM ARN.
- The IPv4 validation regex is intentionally simple (it does not constrain octets to 0–255). This is acceptable for a basic example and the post does not claim otherwise, but a stricter pattern would be a future improvement.
- Console output formatting in `tofu console` may differ slightly from the simplified representations shown (e.g. maps print across multiple lines with quoted keys), but the values are correct.
