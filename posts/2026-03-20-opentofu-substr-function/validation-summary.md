# Validation Summary: How to Use the substr Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (substr function, tofu console)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible function semantics
- AWS provider resources (aws_caller_identity, aws_s3_bucket)
- random_id resource

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/language/functions/substr/
- Terraform substr function reference (compatible behavior): https://developer.hashicorp.com/terraform/language/functions/substr

## Issues Found
No technical issues found.

All claims and examples verified against official OpenTofu documentation:
- The function signature `substr(string, offset, length)` is correct.
- Negative offsets counting from the end of the string are supported.
- Length of `-1` returning the remainder of the string is supported.
- All example outputs were manually verified:
  - `substr("hello world", 0, 5)` → "hello" ✓
  - `substr("hello world", 6, 5)` → "world" ✓
  - `substr("hello world", -5, 5)` → "world" ✓
  - `substr("hello world", 6, -1)` → "world" ✓
  - `substr("us-east-1", 0, 2)` → "us" ✓
  - `substr("authentication-service", 0, 6)` → "authen" ✓
  - ISO date component extractions are positionally correct.
  - Hex color channel extractions are positionally correct.
  - Negative offset and console examples are correct.

## Review Notes
- The post correctly notes that `substr` operates by character position. Per official docs, offsets and lengths are counted in Unicode characters (not bytes), which makes the function safe for multi-byte characters and emoji. The post does not explicitly discuss this Unicode behavior, but this is a minor omission rather than an error.
- The use cases (region abbreviations, name prefixes, date components, hex colors) are all reasonable and match common IaC patterns.
- The `tofu console` command is the correct OpenTofu equivalent of `terraform console`.
