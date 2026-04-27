# Validation Summary: How to Use the parseint Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu
- Terraform (HCL language)
- Infrastructure as Code

## Sources Consulted
- OpenTofu official documentation for `parseint`: https://opentofu.org/docs/language/functions/parseint/
- Terraform documentation for `parseint` (cross-reference): https://developer.hashicorp.com/terraform/language/functions/parseint
- OpenTofu `substr` function documentation: https://opentofu.org/docs/language/functions/substr/
- OpenTofu `try` function documentation: https://opentofu.org/docs/language/functions/try/

## Issues Found
- **Incorrect base range in Syntax section**: The post originally stated the base parameter must be in the range "(2–36)". According to the official OpenTofu documentation, the base must be between 2 and 62 inclusive. Bases 11–36 use case-insensitive Latin letters, and bases 37–62 use lowercase Latin letters first then uppercase. Updated the description to "(2–62)" to match the documentation.

## Review Notes
- All arithmetic in the examples was verified and is correct:
  - `parseint("FF", 16)` = 255 ✓
  - `parseint("1010", 2)` = 10 ✓
  - `parseint("777", 8)` = 511 ✓
  - `parseint("FF5733", 16)` substrings → red 255, green 87, blue 51 ✓
  - `parseint("1F90", 16)` = 8080 ✓
  - `parseint("1101", 2)` = 13 ✓ (and bit-position commentary using LSB-first numbering is consistent)
  - `parseint("755", 8)` = 493 ✓
  - Console examples: `parseint("100", 2)` = 4 ✓, `parseint("1F", 16)` = 31 ✓, `parseint("10", 8)` = 8 ✓
- The `substr(string, offset, length)` usage is correct for the OpenTofu signature.
- The "Supported Bases" table only lists common bases (2, 8, 10, 16, 36); this is not technically wrong since it does not claim to be exhaustive, but readers should note that bases up to 62 are also supported (with the extended alphabet rules).
- The `try()` example correctly handles the error path — `parseint("ZZZZ", 16)` would fail because the alphabet for base 16 only goes up to F, and `try()` will return the fallback value 0.
- The `tofu console` command is the correct way to interactively test expressions.
