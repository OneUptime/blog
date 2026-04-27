# Validation Summary: How to Use the timeadd Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (`timeadd`, `timestamp`, `plantimestamp`, `timecmp`, `formatdate` built-in functions)
- HCL (HashiCorp Configuration Language)
- `tofu console` CLI subcommand
- hashicorp/tls provider (`tls_self_signed_cert`, `tls_private_key`)
- AWS provider (`aws_iam_user`, `aws_instance`)
- RFC 3339 timestamp format
- Go duration string syntax

## Sources Consulted
- OpenTofu `timeadd` function documentation: https://opentofu.org/docs/language/functions/timeadd/
- OpenTofu `timestamp` function documentation: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `plantimestamp` function documentation: https://opentofu.org/docs/language/functions/plantimestamp/
- OpenTofu `timecmp` function documentation: https://opentofu.org/docs/language/functions/timecmp/
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- Go `time.ParseDuration` documentation: https://pkg.go.dev/time#ParseDuration (basis for duration string parsing)
- RFC 3339 specification
- hashicorp/tls provider docs for `tls_self_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- OpenTofu CLI `tofu console` documentation

## Issues Found
No technical issues found.

All technical claims and code examples were verified:
- The `timeadd(timestamp, duration)` signature is correct.
- The duration suffix table (`ns`, `us`, `ms`, `s`, `m`, `h`) matches Go's `time.ParseDuration` (which OpenTofu uses internally).
- Negative duration support is documented behavior.
- Combined duration strings like `"1h30m"` are valid syntax (and "1h30m" = 1.5 hours is mathematically correct).
- Manual time arithmetic in examples is correct:
  - `2026-03-20T00:00:00Z` + `24h` = `2026-03-21T00:00:00Z` ✓
  - `2026-03-20T14:00:00Z` + `-1h` = `2026-03-20T13:00:00Z` ✓
  - `2026-01-01T00:00:00Z` + `720h` (30 days) = `2026-01-31T00:00:00Z` ✓
  - `2026-03-20T12:00:00Z` + `-30m` = `2026-03-20T11:30:00Z` ✓
- The `formatdate("YYYY-MM-DD", ...)` format string is valid (4-digit year, 2-digit month, 2-digit day).
- `tls_self_signed_cert` resource arguments (`private_key_pem`, `subject` block with `common_name`, `validity_period_hours`, `allowed_uses`) all match the current hashicorp/tls provider schema.
- `plantimestamp()` is a valid OpenTofu-specific function for the plan-time timestamp.
- `timecmp()` returns -1, 0, or 1, so `timecmp(now, warning) >= 0` correctly tests for "warning window reached".

## Review Notes
- The `timestamp()` function returns the apply-time timestamp and is impure, which can cause unwanted plan churn. This is a well-known caveat but not raised in the post; users may benefit from being warned, though it's outside the scope of a `timeadd` reference.
- `plantimestamp()` (used in the Temporary Resource TTL example) is OpenTofu-specific and not available in older Terraform versions; readers migrating to/from Terraform should be aware.
- The post correctly avoids claims about month/year duration units, which Go's duration parser does not support — only up to hours.
