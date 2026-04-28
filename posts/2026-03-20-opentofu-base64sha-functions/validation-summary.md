# Validation Summary: How to Use the base64sha256 and base64sha512 Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL functions: `base64sha256`, `base64sha512`, `filebase64sha256`, `sha256`, `file`, `filebase64`)
- Terraform AWS provider (`aws_lambda_function`, `aws_s3_object`)
- AWS Lambda (`source_code_hash`, runtimes)
- AWS S3 (object integrity / change detection)
- SHA-256 / SHA-512 hashing, Base64 encoding

## Sources Consulted
- OpenTofu `base64sha256` docs: https://opentofu.org/docs/language/functions/base64sha256/
- OpenTofu `filebase64sha256` docs: https://opentofu.org/docs/language/functions/filebase64sha256/
- Terraform AWS provider `aws_s3_object` resource docs (hashicorp/terraform-provider-aws on GitHub)
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Go runtime deprecation notice (Jan 8, 2024)

## Issues Found
1. **Incorrect equivalence claim for `filebase64sha256`.** The post stated `filebase64sha256` was equivalent to `base64sha256(filebase64("..."))`. According to OpenTofu's official docs, the equivalence is `base64sha256(file(filename))`. The two are not the same: hashing a Base64-encoded string produces a different digest than hashing the underlying raw bytes. Updated the comment to reference `file(...)` and to note that `filebase64sha256` additionally supports binary files (which `file()` cannot read).

2. **Practical Example computed the hash of the wrong bytes.** The original code did `base64sha256(filebase64(path))`, which hashes the Base64 representation of the ZIP rather than the raw ZIP bytes. AWS Lambda's `source_code_hash` expects the SHA-256 of the raw deployment-package bytes (Base64-encoded). Replaced with `filebase64sha256(path)` directly, which is the correct and idiomatic approach for binary files.

3. **`content_sha256` is not a valid `aws_s3_object` argument.** The post's S3 example assigned the hash to `content_sha256`, but that argument does not exist on `aws_s3_object`. The correct argument for triggering re-uploads based on a content hash is `source_hash` (which also works around `etag` limitations under SSE-KMS). Updated the example and comment accordingly.

4. **Deprecated Lambda runtime `go1.x`.** AWS deprecated the `go1.x` runtime on January 8, 2024 and blocked new function creation on February 8, 2024. The current recommended approach for Go is the OS-only runtime `provided.al2023` with the `bootstrap` handler. Updated the second Lambda example to use `runtime = "provided.al2023"` and `handler = "bootstrap"`.

## Review Notes
- The character-length claim for Base64 SHA-256 (~44 characters) and the "Base64 is ~33% shorter than hex" comparison are both accurate.
- `python3.12` runtime in the first Lambda example is a currently supported runtime as of the validation date.
- The `aws_s3_object` resource also exposes computed `checksum_sha256` (when `checksum_algorithm = "SHA256"` is set) — that is the AWS-server-computed checksum, which is conceptually distinct from the client-computed `source_hash` shown in the example. The example as written is correct for triggering OpenTofu-side updates.
- Future enhancement: a brief note that `base64sha256`/`base64sha512` use the standard Base64 alphabet (RFC 4648) with `=` padding could help readers comparing values to outputs from other tools, but its absence is not a technical error.
