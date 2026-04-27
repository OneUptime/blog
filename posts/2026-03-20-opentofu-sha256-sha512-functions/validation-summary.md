# Validation Summary: How to Use the sha256 and sha512 Functions in OpenTofu - Functions

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (sha256, sha512, filebase64sha256, base64sha256, base64sha512, file, filebase64, substr, md5, sha1)
- HCL (HashiCorp Configuration Language)
- AWS Lambda (`aws_lambda_function` resource, `source_code_hash` attribute)
- AWS CloudWatch Logs (`aws_cloudwatch_log_group`)
- Terraform `null_resource` and `local-exec` provisioner

## Sources Consulted
- OpenTofu sha256 docs: https://opentofu.org/docs/language/functions/sha256/
- OpenTofu sha512 docs: https://opentofu.org/docs/v1.6/language/functions/sha512/
- OpenTofu filebase64sha256 docs: https://opentofu.org/docs/language/functions/filebase64sha256/
- OpenTofu base64sha256 docs: https://opentofu.org/docs/language/functions/base64sha256/
- OpenTofu base64sha512 docs: https://opentofu.org/docs/v1.6/language/functions/base64sha512/
- Terraform AWS provider `aws_lambda_function` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
1. **Incorrect Lambda `source_code_hash` example.** The "Using sha256 for Artifact Integrity" section assigned `sha256(filebase64("${path.module}/dist/function.zip"))` to `aws_lambda_function.source_code_hash`. This is incorrect for two reasons: (a) `sha256()` returns a hex-encoded string, but `source_code_hash` requires a Base64-encoded SHA-256, so Lambda would never see a matching hash and would force a redeploy on every plan; (b) wrapping the file content in `filebase64()` first means the hash is computed over the Base64 representation of the bytes, not the raw bytes. The post's own "Important Notes" section correctly identified that `filebase64sha256` is the right function for this case, so the body example contradicted the notes. **Fix:** changed the local to `filebase64sha256("${path.module}/dist/function.zip")` and updated the inline comment to explain why.

## Review Notes
- Output formats verified: `sha256` returns 64 lowercase hex chars (256-bit), `sha512` returns 128 lowercase hex chars (512-bit), `md5` produces 32 hex chars, `sha1` produces 40 hex chars — all four counts in the comparison table are correct.
- `nodejs20.x` is currently a valid AWS Lambda runtime identifier, but AWS is ending support on April 30, 2026 (3 days after this validation). New function creation with `nodejs20.x` is blocked after June 1, 2026. A future update could move this example to `nodejs22.x`, but as of validation date the runtime string is still functional.
- `substr(string, offset, length)` usage in the SHA-512 fingerprint example is syntactically correct.
- The post correctly notes that `sha256`/`sha512` are appropriate for security-sensitive hashing while `md5`/`sha1` are not.
