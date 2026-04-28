# Validation Summary: How to Use the base64sha256 and base64sha512 Functions in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`base64sha256`, `base64sha512`, `sha256`, `sha512`, `filebase64sha256` functions)
- HCL output, locals, and resource blocks
- AWS Lambda (`aws_lambda_function`, `source_code_hash`)
- `archive_file` data source from the hashicorp/archive provider
- AWS SSM Parameter Store (`aws_ssm_parameter`)
- Base64 encoding (RFC 4648) and SHA-256/SHA-512 (RFC 4634)

## Sources Consulted
- OpenTofu `base64sha256` function docs: https://opentofu.org/docs/language/functions/base64sha256/
- OpenTofu `base64sha512` function docs: https://opentofu.org/docs/language/functions/base64sha512/
- OpenTofu output blocks: https://opentofu.org/docs/language/values/outputs/
- AWS SigV4 signing reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
- Terraform/OpenTofu `aws_lambda_function` resource (`source_code_hash`)
- archive provider `archive_file` data source (`output_base64sha256` attribute)

## Issues Found

1. **Invalid `output` block with multiple `value_*` attributes** (Basic Examples section).
   - **What was wrong:** The example used `value_hex = ...` and `value_b64 = ...` inside a single `output "hex_vs_b64"` block. OpenTofu output blocks only accept a single `value` argument (along with `description`, `sensitive`, `ephemeral`, `depends_on`, `deprecated`, and `precondition`). The original code would fail to parse.
   - **Fix:** Replaced with a single `value` attribute set to an object literal `{ hex = sha256("hello"), b64 = base64sha256("hello") }` so the block is valid and still demonstrates the hex-vs-base64 contrast.

2. **Incorrect AWS SigV4 claim** (was "API Gateway Request Signing" section).
   - **What was wrong:** The comment stated "AWS Signature Version 4 uses base64-encoded SHA-256". Per AWS documentation, the SigV4 `HashedPayload` is `Hex(SHA256Hash(<payload>))` — lowercase hex, not Base64. The section title also implied this applied to AWS API Gateway, which uses SigV4.
   - **Fix:** Renamed the section to "Custom API Payload Hashing" and rewrote the comment to "Some custom APIs require a Base64-encoded SHA-256 of the request payload" so the example is no longer tied to a misstated AWS standard.

## Review Notes
- Verified that the `tofu console` example output `LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=` is the correct Base64 encoding of SHA-256("hello") (`2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`).
- Verified the comparison-table lengths: 32-byte SHA-256 → 44 Base64 chars (with padding); 64-byte SHA-512 → 88 Base64 chars (with padding); hex lengths 64 / 128 are correct.
- The note that `data.archive_file.output_base64sha256` is the idiomatic source for Lambda `source_code_hash` is accurate and matches the hashicorp/archive provider docs.
- The `nodejs18.x` runtime in the Lambda example is currently in deprecation phase by AWS (replaced by `nodejs20.x` and `nodejs22.x`); not technically incorrect at the time of writing, but readers building new Lambdas should prefer a non-deprecated runtime.
- The `aws_ssm_parameter` example uses `type = "String"` and tags a hash on the parameter; this is valid but consider that updating the tag does not by itself force a value rewrite. Out of scope for this review.
