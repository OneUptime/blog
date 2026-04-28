# Validation Summary: How to Use the abs Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide for an OpenTofu built-in function.

## Technologies Covered
- OpenTofu (numeric function `abs`)
- HCL (HashiCorp Configuration Language) syntax
- `tofu console` CLI subcommand
- AWS provider (`aws_ebs_volume` resource used as an example)

## Sources Consulted
- Official OpenTofu `abs` function documentation: https://opentofu.org/docs/language/functions/abs/
- OpenTofu CLI documentation for `tofu console`
- HCL numeric/math function semantics

## Issues Found
No technical issues found.

- Syntax `abs(number)` is correct and matches the official OpenTofu function signature.
- Documented behavior (returns input if positive, returns positive equivalent if negative, returns 0 for 0/-0) matches the official documentation.
- Example outputs (`abs(-5) = 5`, `abs(-3.14) = 3.14`, `abs(0) = 0`) are consistent with the official examples (`abs(23) = 23`, `abs(0) = 0`, `abs(-12.4) = 12.4`).
- All HCL configuration examples (variables, locals, outputs, `aws_ebs_volume` resource) are syntactically valid.
- The `tofu console` interactive workflow is accurate; the prompt and outputs shown match real console behavior.
- The combined math example `min(abs(-15), 10)` correctly evaluates to `10`.

## Review Notes
- The "Common Mistakes" note that "passing a string instead of a number — OpenTofu will raise a type error" is a reasonable simplification. In practice, HCL performs automatic type conversion, so a string containing a valid numeric literal (e.g. `abs("-5")`) will be coerced to a number and succeed; only non-numeric strings (e.g. `abs("hello")`) raise a type error. This is a minor nuance and not incorrect enough to require an edit.
- The `aws_ebs_volume` example uses `abs()` to coerce a negative `storage_size_gb` default into a positive size. This is illustrative only — in real configurations, `validation` blocks on the variable would be a more appropriate guard. The post is presenting `abs` mechanics, not best-practice variable validation, so this is fine for the scope of the tutorial.
- No version-specific caveats: `abs` has been a stable Terraform/OpenTofu function across all current versions.
