# Validation Summary: How to Use the floor Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (language built-in `floor` function)
- HCL (HashiCorp Configuration Language)
- `tofu console` CLI subcommand
- AWS provider (incidental, used in one example with `aws_instance`)

## Sources Consulted
- OpenTofu official `floor` function docs: https://opentofu.org/docs/language/functions/floor/
- OpenTofu numeric functions reference (cross-checked for absence of `round`)

## Issues Found
No technical issues found.

All claims and examples were verified:
- `floor(number)` syntax matches official docs ("closest whole number less than or equal to the given value").
- `floor(1.9) = 1`, `floor(-1.1) = -2`, `floor(4.0) = 4` are all correct.
- Budget example: `500 / 73.6 ≈ 6.793`, `floor(...) = 6` is correct.
- Batches example: `1050 / 100 = 10.5`, `floor(...) = 10`, remainder `50` is correct.
- CPU band example: `floor(67.8 / 10) * 10 = 60` is correct.
- `tofu console` outputs (`floor(3.9)=3`, `floor(3.0)=3`, `floor(-3.1)=-4`) are correct.
- The claim that OpenTofu has no built-in `round` function is correct — only `ceil` and `floor` exist for whole-number rounding.
- The `floor(value + 0.5)` rounding trick produces `3` for `2.6` as stated.
- The note that `ceil` should be used for negative numbers when rounding toward zero is correct (`ceil(-1.1) = -1`).

## Review Notes
- The "rounds away from zero" annotation on `floor(-1.1)` is accurate in the negative-number case but is a per-example observation, not a general property of `floor` (which always rounds toward negative infinity). The post correctly clarifies the toward-zero behavior in the Common Pitfalls section.
- The `floor(value + 0.5)` rounding trick works correctly for positive numbers as shown, but produces banker-style "round half down" behavior for negatives (e.g. `floor(-2.5 + 0.5) = -2`, not `-3`). The example only uses a positive value, so it is not misleading as written.
