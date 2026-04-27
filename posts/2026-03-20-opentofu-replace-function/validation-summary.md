# Validation Summary: How to Use the replace Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL string functions)
- Terraform-compatible HCL syntax
- RE2 regex (used by OpenTofu's `replace`)
- AWS provider resources used in examples (`aws_s3_bucket`, `aws_ssm_parameter`)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/language/functions/replace/
- OpenTofu CLI commands reference (`tofu console`)

## Issues Found
No technical issues found.

Verification details:
- Function signature `replace(string, search, replacement)` matches the official signature `replace(string, substring, replacement)`.
- Regex behavior: wrapping the search in `/.../` triggers RE2 regex matching — confirmed by the docs.
- Capture group references with `$n` (e.g., `-$1`) are supported — confirmed by the docs.
- All sample outputs were traced manually and match expected behavior:
  - `replace("hello world", "world", "OpenTofu")` → `"hello OpenTofu"` ✓
  - `replace("my service name", " ", "-")` → `"my-service-name"` ✓
  - `replace("abc123def456", "/[0-9]+/", "NUM")` → `"abcNUMdefNUM"` ✓
  - Slug pipeline on `"My Amazing Service Name"` → `"content-my-amazing-service-name"` ✓
  - Region normalization `"us-east-1"` → `"us_east_1"` ✓
  - Sanitization of `"My Project! 2024 (v2)"` → `"my-project-2024-v2"` ✓
  - camelCase to kebab-case `"myServiceName"` → `"my-service-name"` ✓
  - Account hyphen stripping `"1234-5678-9012"` → `"123456789012"` ✓
  - Console examples (literal `.` substitution, digit regex) ✓
- `tofu console` is a valid OpenTofu subcommand for evaluating expressions interactively.

## Review Notes
- The post correctly notes that wrapping the pattern in forward slashes activates regex mode — this is a common gotcha worth highlighting (e.g., `replace("a.b.c", ".", "-")` works as a literal substitution because the `.` is not slash-wrapped).
- OpenTofu's regex engine is RE2 (Go's regex flavor), which does not support lookarounds or backreferences in the pattern — the post's examples stay within RE2's supported features.
- The capture-group syntax uses `$1` (not `\1`), consistent with Go's regex replacement syntax — correctly used in the camelCase→kebab-case example.
