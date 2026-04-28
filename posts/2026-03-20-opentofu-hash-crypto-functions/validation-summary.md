# Validation Summary: How to Use Hash and Crypto Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (hash and crypto built-in functions)
- Terraform (compatible function set)
- HCL (HashiCorp Configuration Language)
- AWS provider examples (aws_s3_bucket, aws_s3_object, aws_lambda_function, aws_iam_user_login_profile, aws_caller_identity)
- Hashing algorithms: MD5, SHA-1, SHA-256, SHA-512, BCrypt

## Sources Consulted
- OpenTofu `md5` function docs: https://opentofu.org/docs/language/functions/md5/
- OpenTofu `sha1` function docs: https://opentofu.org/docs/language/functions/sha1/
- OpenTofu `sha256` function docs: https://opentofu.org/docs/language/functions/sha256/
- OpenTofu `sha512` function docs: https://opentofu.org/docs/language/functions/sha512/
- OpenTofu `bcrypt` function docs: https://opentofu.org/docs/language/functions/bcrypt/
- OpenTofu `filemd5`/`filesha256` function docs: https://opentofu.org/docs/language/functions/filemd5/, https://opentofu.org/docs/language/functions/filesha256/
- Verified hash outputs locally with `md5sum`, `sha1sum`, `sha256sum`, `sha512sum` against the exact byte sequence `hello world` (no trailing newline).

## Issues Found
1. **Incorrect SHA-1 example output.** The post showed `sha1("hello world") = "2aae6c69ec0ba598f52e244b22f0e0c6e3b5a7be"`. The correct value (per RFC 3174 and the OpenTofu docs) is `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`. Fixed.
2. **Incorrect SHA-256 example output.** The post showed `sha256("hello world") = "b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576b14..."`. The correct value is `b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9`. The leading bytes after `...484efe` were wrong. Replaced with the full correct hash.

All other claims verified:
- `md5("hello world") = 5eb63bbbe01eeed093cb22bb8f5acdc3` is correct.
- `sha512("hello world") = 309ecc...ae9cd76f` is correct.
- `bcrypt()` default cost of 10 is correct per the OpenTofu docs.
- Function signatures, hex digest lengths (MD5: 32, SHA-1: 40, SHA-256: 64, SHA-512: 128), and `file*` variants are accurate.
- HCL syntax in all examples is valid.

## Review Notes
- The `aws_iam_user_login_profile` example in the bcrypt section does not actually invoke `bcrypt()` (the resource uses `pgp_key` for password encryption, not bcrypt-hashed passwords). The snippet still shows valid HCL but is a weak illustration of `bcrypt()`'s use case. Not corrected because it is not technically wrong; future revisions could pick a clearer example (e.g., `htpasswd_file` content, Kubernetes secret, or a provider that accepts a bcrypt hash directly).
- The post correctly notes that `bcrypt()` produces a different result on each call (random salt). A subtle gotcha worth flagging in a future revision: using `bcrypt()` directly in resource arguments causes spurious diffs on every plan; the OpenTofu docs explicitly recommend confining it to provisioners or `random_password`-style ephemeral usage.
- MD5 and SHA-1 are noted by upstream docs as collision-vulnerable. The post recommends `sha256()` for security-sensitive uses, which aligns with current best practice.
