# Validation Summary: How to Use the sha1 Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`sha1` function)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_instance`, `aws_s3_object`, `aws_ssm_parameter`)
- `null_resource` provisioner pattern
- SHA-1 cryptographic hash function

## Sources Consulted
- OpenTofu language functions documentation: https://opentofu.org/docs/language/functions/sha1/
- Terraform documentation for `sha1` (equivalent function): https://developer.hashicorp.com/terraform/language/functions/sha1
- Verified hash values directly with `sha1sum` (coreutils)
- AWS provider documentation for `aws_s3_object`, `aws_ssm_parameter`, and `aws_instance` resources

## Issues Found
- **Incorrect SHA-1 hash in basic example.** The Basic Examples section showed `sha1("hello world")` returning `"2aae6c69ec0d0328f6a52aca7f68c5f0"` with a second "actual" comment of `"2aae6c69ec0db7e1f5c0f6c58f0c5c6c..."`. Both values are wrong — neither matches the real SHA-1 of "hello world". The first value is also only 32 chars (MD5 length), not 40 chars (SHA-1 length). Replaced with the correct hash, `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`, verified via `sha1sum`. The dual conflicting comments were also confusing, so they were consolidated into a single accurate "Returns" comment.

## Review Notes
- The hash for `sha1("hello")` shown in the `tofu console` section (`aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d`) is correct.
- `length(sha1("test")) == 40` is correct — SHA-1 always produces a 40-char lowercase hex string.
- Calling SHA-1 "deprecated" in the security comparison table is reasonable shorthand for its cryptographic deprecation (NIST SP 800-131A disallowed it for digital signatures), even though the OpenTofu `sha1` function itself is not deprecated. Acceptable as written.
- Code patterns (using a content hash as a `null_resource` trigger, as an S3 key suffix, and as an SSM parameter tag) are valid and idiomatic in OpenTofu/Terraform.
- The post correctly steers readers to `sha256` for security-sensitive uses.
