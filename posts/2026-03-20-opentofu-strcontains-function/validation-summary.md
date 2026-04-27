# Validation Summary: How to Use the strcontains Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL functions)
- Terraform-compatible HCL syntax
- AWS resources (aws_instance, aws_s3_bucket) used as examples

## Sources Consulted
- Official OpenTofu documentation for `strcontains`: https://opentofu.org/docs/language/functions/strcontains/
- Go `strings.Contains` semantics (the underlying implementation), which defines the empty-substring and case-sensitivity behavior
- OpenTofu language reference for `validation` blocks within `variable` definitions
- AWS EC2 instance type families (R5/R6i memory-optimized; P3/G4 GPU)

## Issues Found
No technical issues found.

- The function signature `strcontains(string, substr)` matches the official documentation.
- Return type (boolean) is correct.
- Case-sensitivity claim is correct — `strcontains` performs a byte-level substring match (Go `strings.Contains` semantics), so `strcontains("Hello", "hello")` is `false`.
- Empty-substring behavior is correct — `strcontains("hello", "")` returns `true`, consistent with Go's `strings.Contains`.
- All HCL examples are syntactically valid: `locals`, `for` expressions with `if` filters, `output` blocks, and `validation` blocks inside `variable` are all used correctly.
- The `tofu console` invocation and example output format are accurate.
- AWS instance family heuristics in the example (r5/r6i for memory-optimized; p3/g4 for GPU) are accurate.

## Review Notes
- The empty-substring example correctly notes "empty string is always contained," which is a useful clarification because users coming from regex or other languages sometimes expect different behavior.
- `strcontains` was introduced in Terraform 1.5 and is available in OpenTofu from 1.6 onward; the post does not call out a minimum version, but this is not strictly an error since OpenTofu has supported it since the project's first stable release.
- The Docker image validation example uses two `validation` blocks; multiple validation blocks per variable are supported in OpenTofu and Terraform >= 1.2, so this is fine.
- For very large strings or hot loops, users could prefer `regex`/`regexall` for more advanced matching, but for simple substring checks `strcontains` is the idiomatic choice — the post's recommendation is sound.
