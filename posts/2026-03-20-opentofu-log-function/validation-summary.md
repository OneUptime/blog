# Validation Summary: How to Use the log Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (language built-in `log` function)
- Terraform (compatible HCL function)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- OpenTofu `log` function documentation: https://opentofu.org/docs/language/functions/log/
- Terraform `log` function documentation: https://developer.hashicorp.com/terraform/language/functions/log
- OpenTofu numeric functions index: https://opentofu.org/docs/language/functions/
- Empirical verification with `tofu console` against OpenTofu v1.8.5 (signature, edge-case behavior for `log(0, base)`, presence/absence of `round`, exact float results for `log(100,10)`, `log(1000,10)`, `log(1024,2)`, `log(16,2)`)

## Issues Found

1. **Incorrect claim that `log(0, base)` returns an error.**
   - Original text: ``- `log(0, base)` is undefined and will return an error. Always ensure the input is positive.``
   - Verified behavior: OpenTofu returns `-Infinity` (negative infinity), not an error. The non-finite value silently propagates through subsequent arithmetic, which is arguably worse than erroring.
   - Fix: Updated the bullet to state that `log(0, base)` returns `-Infinity` and to warn about non-finite values propagating into downstream calculations.

2. **Misleading comment claiming `log(1000, 10)` returns `3`.**
   - Original text: ``value = log(1000, 10)  # Returns 3``
   - Verified behavior: Returns `2.9999999999999996` due to floating-point imprecision when dividing `ln(1000) / ln(10)`. While the post's Common Pitfalls section warns about this category of imprecision, the inline comment promised an exact `3`, which contradicts the actual output.
   - Fix: Updated the comment to ``# Returns 2.9999999999999996 (float imprecision; mathematically 3)`` so readers running the example are not surprised.

## Review Notes
- All other math examples are accurate against live `tofu console` output:
  - `log(8, 2)` → `3` (exact)
  - `log(100, 10)` → `2` (exact, no float drift — this case happens to land cleanly)
  - `log(1024, 2)` → `10` (exact)
  - `log(2.718281828, 2.718281828)` → `1` (any value log'd against itself)
  - `log(256, 2)` → `8` (exact, since 256 = 2^8)
  - `log(10000, 10)` → `4` (exact in IEEE 754)
- The claim that OpenTofu has no separate `ln` or `log10` is correct — only `log(number, base)` exists.
- The recommendation to use `floor(x + 0.5)` for rounding is appropriate: OpenTofu does indeed not provide a built-in `round` function (the available numeric functions are `abs`, `ceil`, `floor`, `log`, `pow`, `signum`, and `parseint`). Note this workaround only rounds correctly for non-negative numbers.
- The `tofu console` examples in the Step-by-Step section happen to all land on values that are exact in floating point (`log(100,10)=2`, `log(1024,2)=10`, `floor(log(500,10))=2`), so those outputs are accurate.
