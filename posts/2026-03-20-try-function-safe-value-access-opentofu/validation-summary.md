# Validation Summary: How to Use try Function for Safe Value Access in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language)
- `try` built-in function
- `lookup` built-in function
- `tonumber` built-in function
- `optional()` type constraint modifier
- AWS provider data sources (illustrative examples)

## Sources Consulted
- OpenTofu `try` function documentation: https://opentofu.org/docs/language/functions/try/
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu Type Constraints (including `optional()`): https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu Local Values documentation: https://opentofu.org/docs/language/values/locals/

## Issues Found

1. **Use Case 2 — incorrect claim that a data source can be `null`.** The original text said `data.aws_instance.existing might be null if the resource doesn't exist`. Data sources without `count`/`for_each` error at plan/refresh time when no match is found; they do not return `null`, and `try` cannot catch a provider-level error. Rewrote the example to use `count = var.lookup_existing ? 1 : 0` so the collection can legitimately be empty, making `try(data.aws_instance.existing[0].private_ip, "")` a valid evaluation-error case. Added a clarifying note that `try` does not catch provider errors.

2. **Use Case 5 — example did not actually trigger the fallback.** The original code was `try(var.tags, { default = true })` with `var.tags` defaulting to `null`. Per the OpenTofu `try` docs, `null` is a valid value, not an error, so `try(null, ...)` returns `null` — the fallback is never reached. Rewrote the example to use attribute accesses (`var.tags.custom`, then `var.tags.default`) that genuinely raise evaluation errors when the attributes are absent, and added a sentence clarifying that `null` does not trigger a fallback.

3. **`try` vs `lookup` comparison — invalid HCL syntax.** The original snippet used `local.value = lookup(...)` and `local.value = try(...)` at the top level, which is not valid HCL (local values must be declared inside a `locals { ... }` block; `local.` is reference syntax only). Wrapped both examples in a `locals { ... }` block with distinct names.

## Review Notes
- Use Case 1 (missing map key) is correct: indexing a missing key with `[]` raises an "Invalid index" error, which `try` catches.
- Use Case 3 (`tonumber` fallback) is correct: `tonumber` raises on non-numeric strings, and `try` catches the conversion error.
- Use Case 4 (`optional(object({...}))`) is correct: an omitted optional object with no default becomes `null`, and accessing `.mode` on `null` is an evaluation error that `try` catches.
- The "What try Does NOT Cover" section is accurate.
- The official OpenTofu docs recommend using `try` sparingly because it can mask debuggable errors — the post's framing as "primary tool" is strong but not technically incorrect. Worth keeping in mind for future revisions.
