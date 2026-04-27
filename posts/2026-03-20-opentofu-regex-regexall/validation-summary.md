# Validation Summary: How to Use regex() and regexall() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (and Terraform — same `regex()`/`regexall()` semantics)
- HCL (HashiCorp Configuration Language)
- RE2 regex syntax (Go's `regexp` package)

## Sources Consulted
- OpenTofu `regex()` docs: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `regexall()` docs: https://opentofu.org/docs/language/functions/regexall/
- RE2 syntax reference: https://github.com/google/re2/wiki/Syntax

## Issues Found
- **Contradictory/incorrect example for unnamed capture groups.** The original post had two consecutive examples using the same regex `([a-z]+)-([0-9]+)` against `"server-123"`. The first claimed the function "Returns the whole match, not captures in this form", while the second correctly showed it returning `["server", "123"]`. Per the OpenTofu docs, when the pattern has unnamed capture groups, `regex()` returns a list of the captured substrings (not the whole match). Removed the incorrect first block and clarified the labels on the remaining examples ("no capture groups", "named capture groups", "unnamed capture groups") so each case is described accurately.

## Review Notes
- All other technical claims verified against official docs:
  - RE2 syntax (no lookaheads or backreferences) — correct.
  - `regex()` errors when no match — correct; pairing with `can()` for validation is the documented pattern.
  - `regexall()` returns an empty list when no match — implied by the `length(regexall(...)) > 0` example, which is correct.
  - Named capture group syntax `(?P<name>...)` — correct RE2 syntax.
  - ARN, version, port, and email validation regex examples all parse and behave as the comments claim.
- Minor caveat (not corrected, since it isn't strictly wrong): the AMI-ID validation regex `^ami-[0-9a-f]{8,17}$` allows lengths between 8 and 17, while real AMI IDs are exactly 8 (legacy) or exactly 17 chars. A stricter version would be `^ami-([0-9a-f]{8}|[0-9a-f]{17})$`, but the current pattern still rejects most malformed inputs and the post explicitly describes it loosely as "ami-XXXXXXXX format".
- The post does not mention the constraint that named and unnamed capture groups cannot be mixed in the same pattern, but no example in the post mixes them, so this is not a correctness issue — only a possible future enhancement.
