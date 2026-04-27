# Validation Summary: How to Configure S3 Backend with Customer-Provided Encryption Keys in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend, partial backend configuration)
- Terraform-style HCL configuration
- AWS S3 Server-Side Encryption with Customer-Provided Keys (SSE-C)
- AWS Secrets Manager
- AWS CLI
- OpenSSL (for key generation)
- Bash / CI/CD shell snippets

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS S3 SSE-C documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html
- AWS Secrets Manager CLI reference (`aws secretsmanager get-secret-value`, `aws secretsmanager create-secret`)
- OpenTofu 1.8 release notes (variables/locals in backend configuration)

## Issues Found
- **Invalid backend argument `sse_customer_algorithm`**: The original post declared `sse_customer_algorithm = "AES256"` in the S3 backend block and again as a `-backend-config` flag. The OpenTofu (and upstream Terraform) S3 backend does **not** expose an `sse_customer_algorithm` argument — only `sse_customer_key`. The algorithm is implicitly AES256 when an SSE-C key is supplied. I removed both occurrences of `sse_customer_algorithm` and added a brief inline comment noting that the algorithm is implicit, to keep the example accurate.

## Review Notes
- Using `var.state_encryption_key` directly inside the `backend "s3"` block is valid because OpenTofu 1.8+ permits variables and locals in backend configuration blocks (unlike Terraform, which still forbids it). Readers on Terraform — or pre-1.8 OpenTofu — would need to fall back to the partial backend configuration approach shown later in the post.
- The OpenTofu docs recommend supplying the SSE-C key via the `AWS_SSE_CUSTOMER_KEY` environment variable rather than via configuration, because values placed in HCL get persisted in the local plan/state on disk. The post's `TF_VAR_state_encryption_key` + `var.state_encryption_key` pattern is functional but writes the key into the backend configuration cache; mentioning `AWS_SSE_CUSTOMER_KEY` would be a useful future improvement (not a correctness issue).
- The key rotation procedure works in practice but assumes the reader will run `tofu init -reconfigure` (or equivalent) between Steps 2 and 3 so the new key is picked up by the backend; a sentence calling that out would prevent confusion. Not a technical error, just a clarity opportunity.
- The comparison table accurately reflects current OpenTofu encryption options (SSE-S3 via `encrypt`, SSE-KMS via `kms_key_id`, SSE-C via `sse_customer_key`, plus OpenTofu's native state encryption introduced in 1.7).
- The AWS-side claims (S3 stores only an HMAC/MD5 of the SSE-C key for verification, key loss makes data unrecoverable) match the AWS S3 SSE-C documentation.
