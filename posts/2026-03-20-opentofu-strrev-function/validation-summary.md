# Validation Summary: How to Use the strrev Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (the `strrev` string function)
- HCL (HashiCorp Configuration Language)
- `tofu console` CLI command
- Terraform-compatible string functions: `strrev`, `substr`, `upper`
- AWS provider example (`aws_s3_bucket`)
- Variable validation blocks

## Sources Consulted
- OpenTofu documentation – `strrev` function: https://opentofu.org/docs/language/functions/strrev/
- OpenTofu documentation – `substr` function: https://opentofu.org/docs/language/functions/substr/
- OpenTofu documentation – `upper` function: https://opentofu.org/docs/language/functions/upper/
- OpenTofu documentation – Custom Variable Validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu CLI – `tofu console` command: https://opentofu.org/docs/cli/commands/console/
- HashiCorp `cty` stdlib `Reverse` implementation (operates on Unicode grapheme clusters)

## Issues Found
1. **Incorrect computed output for `strrev("OpenTofu")`** — The post stated the result was `"ufuTnepO"`. The actual reversal of `"OpenTofu"` (8 characters) is `"ufoTnepO"`. Fixed in the `tofu console` example.
2. **Incorrect computed output for `upper(substr(strrev("myservice"), 0, 4))`** — The post stated the result was `"CIVR"`. The actual reversal of `"myservice"` is `"ecivresym"`; taking the first 4 characters yields `"eciv"`, and applying `upper` produces `"ECIV"`. Fixed the inline comment in the "Combining with Other Functions" section.

## Review Notes
- All other code examples were verified to produce the outputs shown:
  - `strrev("hello")` → `"olleh"` ✓
  - `strrev("12345")` → `"54321"` ✓
  - `strrev("abc-123")` → `"321-cba"` ✓
  - `strrev("racecar") == "racecar"` → `true` ✓
  - `substr(strrev("production"), 0, 4)` → `"noit"` ✓
  - `strrev("321")` → `"123"` ✓
- The `substr(string, offset, length)` signature used in the examples matches the official OpenTofu function signature.
- The `validation` block syntax inside a `variable` block is correct for current OpenTofu versions.
- The Unicode-handling claim is accurate: OpenTofu's `strrev` (via the underlying `cty` stdlib `Reverse` function) operates on Unicode grapheme clusters, so combining characters stay attached to their base character.
- The `tofu console` REPL behavior shown is consistent with the actual CLI.
- Minor stylistic note (not corrected — out of scope): the post describes `strrev` as suitable for "obfuscation" of identifiers, which is true only in a very weak sense (trivially reversible). The post already qualifies this as "Obfuscating (not encrypting)", which is acceptable.
