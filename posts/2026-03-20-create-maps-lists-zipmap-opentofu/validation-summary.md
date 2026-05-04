# Validation Summary: How to Create Maps and Lists with zipmap in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language)
- HCL built-in functions: `zipmap`, `tomap`, `tostring`, `flatten`
- HCL `for` expressions
- Splat expressions (`[*]`)
- AWS provider resources (`aws_vpc`, `aws_subnet`) used as illustrative context
- `tofu console` CLI

## Sources Consulted
- OpenTofu zipmap function documentation: https://opentofu.org/docs/language/functions/zipmap/
- OpenTofu tomap function documentation: https://opentofu.org/docs/language/functions/tomap/
- OpenTofu flatten function documentation: https://opentofu.org/docs/language/functions/flatten/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu splat expressions documentation: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu CLI `tofu console` documentation: https://opentofu.org/docs/cli/commands/console/

## Issues Found
- The section titled "tomap - Convert an Object to a Map" did not actually use the `tomap` function; the example only used a `for` expression with `tostring`. This contradicted the section title and the post's stated description. Fixed by wrapping the `for` expression in `tomap(...)`, so the example now genuinely demonstrates `tomap` (object → map conversion) while still showing the `tostring` value normalization.

## Review Notes
- The `zipmap` semantics (parallel keys/values lists, equal length, last-wins on duplicate keys) are correctly described.
- The splat usage `aws_subnet.public[*].id` assumes the subnet was declared with `count`. This is implicit but conventional for the pattern shown; no change needed.
- The `flatten` example is correct: `flatten` recursively flattens nested lists into a single list.
- The map-inversion example using a `for` expression is correct; if `original` had duplicate values, the inversion would silently lose entries — worth noting for readers but not a technical error.
- `tofu console` is a valid OpenTofu CLI command for interactively evaluating expressions, suitable for testing the transformations shown.
