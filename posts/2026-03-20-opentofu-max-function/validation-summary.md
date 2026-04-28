# Validation Summary: How to Use the max Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (`max` and `ceil` built-in functions, `tofu console`)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_autoscaling_group`, `aws_ebs_volume`, `aws_launch_template` reference)
- Splat / expansion operator (`...`) for variadic argument expansion

## Sources Consulted
- OpenTofu `max` function docs: https://opentofu.org/docs/language/functions/max/
- Terraform `max` function docs: https://developer.hashicorp.com/terraform/language/functions/max
- OpenTofu `ceil` function docs: https://opentofu.org/docs/language/functions/ceil/
- OpenTofu expansion / splat operator (variadic argument expansion via `...`)

## Issues Found
- **Incorrect arity claim in Syntax section.** The post originally stated `max` "Accepts two or more numeric arguments," which contradicts both the official docs ("`max` takes one or more numbers and returns the greatest number from the set") and the post's own Common Pitfalls section ("Passing fewer than two arguments is valid (`max(5)` returns `5`)"). Updated to "Accepts one or more numeric arguments." to match the official documentation and resolve the internal contradiction.

## Review Notes
- All numeric outputs in the examples were verified by hand:
  - `max(3, 1, 7, 2)` = 7 ✓
  - `max(10, 20)` = 20 ✓
  - `max(-5, -3, -10)` = -3 ✓ (largest of negatives)
  - `max([1, 3, 2, 5, 4]...)` = 5 ✓
  - `max(ceil(50/30), 2)` = `max(2, 2)` = 2 ✓
  - `tofu console` example: `max([1, 2, 3]...)` = 3 ✓
- The pitfall about string inputs is broadly correct in spirit. Strictly, OpenTofu/Terraform performs automatic type conversion between primitive types, so a numeric string like `"5"` may be auto-converted to a number in many contexts; non-numeric strings produce a type error. The post's advice to "ensure all inputs are numbers" is sound defensive guidance — no change needed.
- The `aws_autoscaling_group` snippet uses `version = "$Latest"` for `launch_template`, which is the correct AWS literal string for "always use the latest version" — verified.
- No version-specific caveats: the `max` function and `...` expansion have been stable in Terraform since 0.12 and are inherited by OpenTofu unchanged.
