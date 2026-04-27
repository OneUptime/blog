# Validation Summary: How to Use the pow Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference (function reference with practical examples)

## Technologies Covered
- OpenTofu (`pow` function, `tofu console`)
- HCL (Terraform/OpenTofu configuration language)
- AWS provider (`aws_ebs_volume` resource, `io1` volume type)

## Sources Consulted
- OpenTofu `pow` function documentation: https://opentofu.org/docs/language/functions/pow/
- OpenTofu source for the `pow` function (uses Go's `math.Pow` via `cty.NumberFloatVal`): https://github.com/opentofu/opentofu/blob/main/internal/lang/funcs/number.go
- HCL arithmetic operator semantics (big.Float division for `/`): https://github.com/hashicorp/hcl/blob/main/hclsyntax/expression_ops.go
- Go `math.Pow` documentation: https://pkg.go.dev/math#Pow
- AWS provider `aws_ebs_volume` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Local empirical verification of `math.Pow` with Go 1.22 to confirm float64 precision behavior

## Issues Found
- **Cube root example was mathematically incorrect.** The original post included `pow(27, 1/3)  # Returns 3 (cube root)` in the Basic Examples section. OpenTofu evaluates this by converting `1/3` (computed in big.Float) to a float64 (~0.3333333333333333) and calling Go's `math.Pow`. Empirically `math.Pow(27, 0.3333333333333333) = 2.9999999999999996`, so the actual return is **not** 3. I removed this single line. The remaining `pow(9, 0.5)` (square root) example still demonstrates fractional exponents and returns exactly 3 because 0.5 is exactly representable in float64 and 9 is a perfect square.

## Review Notes
- All other numeric claims were verified: `pow(2, 2)=4`, `pow(2, 10)=1024`, `pow(9, 0.5)=3`, `pow(2, 3)=8` (storage tier and backoff defaults), `pow(10, 3)=1000`, `pow(2, 30)=1073741824`, `pow(2, 8)=256`, `pow(4, 0.5)=2`, `pow(1.5, 4)=5.0625` and `ceil(5.0625)=6`.
- The `aws_ebs_volume` examples are valid: 1000 IOPS is within the allowed range for `io1` (min 100, max 64000 and capped at 50:1 IOPS-to-GB for io1, well under the 100 GB × 50 = 5000 limit).
- "Returns a float value" in the Syntax section is acceptable: OpenTofu's `pow` is implemented as `cty.NumberFloatVal(math.Pow(...))`, though whole-number results display without a decimal point in practice (e.g., `pow(2, 2)` prints as `4`).
- General floating-point caveat: any non-exactly-representable exponent (e.g., 1/3, 1/7) can produce small precision artifacts (e.g., `2.9999...96`). Users doing similar calculations may want to wrap results in `floor`/`ceil`/`round` when an integer is expected.
