# Validation Summary: How to Use the timestamp Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu
- HCL (HashiCorp Configuration Language)
- Terraform (compatible language features)
- `timestamp()`, `plantimestamp()`, `formatdate()`, `timeadd()`, `timecmp()` built-in functions
- `tls_self_signed_cert` resource (HashiCorp TLS provider)
- `null_resource` (HashiCorp null provider)
- AWS provider (`aws_instance`)

## Sources Consulted
- [OpenTofu timestamp() function docs](https://opentofu.org/docs/language/functions/timestamp/)
- [OpenTofu plantimestamp() function docs](https://opentofu.org/docs/v1.11/language/functions/plantimestamp/)
- [OpenTofu timeadd() function docs](https://opentofu.org/docs/language/functions/timeadd/)
- [OpenTofu timecmp() function docs](https://opentofu.org/docs/language/functions/timecmp/)
- [OpenTofu formatdate() function docs](https://opentofu.org/docs/v1.8/language/functions/formatdate/)
- OpenTofu source code: `internal/lang/funcs/datetime.go` (confirms `time.RFC3339` formatting via `time.Now().UTC().Format(time.RFC3339)`)

## Issues Found
1. **Console output example included fractional seconds.** The post showed:
   ```
   > timestamp()
   "2026-03-20T14:30:00.000Z"
   ```
   The `timestamp()` function uses Go's `time.RFC3339` format (`2006-01-02T15:04:05Z07:00`), which does **not** include fractional seconds. This was also inconsistent with the earlier example in the Syntax section that correctly showed `"2026-03-20T14:30:00Z"`. Fixed to remove the `.000` so the output matches the actual format produced by OpenTofu.

## Review Notes
- The bullet "Evaluated at plan time" is a slight simplification — `timestamp()` is re-evaluated whenever it is referenced (including during apply), which is why it commonly causes perpetual diffs on resource attributes. The next bullet ("Can change between evaluations") captures this caveat clearly enough that no edit was needed.
- The `timecmp()` example correctly relies on the documented return values (-1, 0, 1), so `>= 0` properly evaluates "now is at or after the cutoff."
- The `formatdate("YYYY-MM-DD", ...)` specification characters are valid per OpenTofu docs.
- The `lifecycle.ignore_changes = [tags["PlannedAt"]]` syntax is supported (map element references in `ignore_changes` have been valid since Terraform 1.x and carried over to OpenTofu).
- `tls_self_signed_cert` arguments (`validity_period_hours`, `allowed_uses`, `subject` block) match the current TLS provider schema.
- `plantimestamp()` is an OpenTofu-only function (it does not exist in Terraform), which is worth keeping in mind if readers are migrating between the two — but the post is OpenTofu-specific, so this is correct as written.
