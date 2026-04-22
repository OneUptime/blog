# Validation Summary: How to Configure S3 Backend with Server-Side Encryption in OpenTofu (2)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu S3 backend
- OpenTofu state and plan encryption
- Amazon S3 server-side encryption
- AWS KMS
- Terraform/OpenTofu HCL
- Terraform AWS provider S3 and KMS resources

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend source: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/client.go
- OpenTofu AWS KMS key provider source: https://github.com/opentofu/opentofu/blob/main/internal/encryption/keyprovider/aws_kms/config.go
- AWS S3 default bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html
- AWS S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS S3 DSSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-dsse-encryption.html
- AWS CloudFormation ServerSideEncryptionByDefault reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-serversideencryptionbydefault.html
- Terraform AWS provider aws_s3_bucket_server_side_encryption_configuration documentation/source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS provider aws_kms_key documentation/source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_key.html.markdown
- AWS KMS condition keys documentation: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html

## Issues Found
- The SSE-S3 backend example used unsupported `server_side_encryption = "aws:s3"`. OpenTofu's S3 backend supports `encrypt`, `kms_key_id`, and `sse_customer_key`, not `server_side_encryption`; I removed the unsupported argument and kept `encrypt = true`.
- The example KMS key ARN used an invalid shortened multi-Region key ID (`mrk-abc123`). I replaced it with a syntactically valid KMS key ARN example.
- The KMS key policy omitted `kms:Encrypt`, which OpenTofu documents as required when `kms_key_id` is used by the S3 backend. I added `kms:Encrypt` to the relevant KMS use statements.
- The DSSE-KMS backend example used unsupported OpenTofu backend configuration. I changed it to configure DSSE-KMS as S3 bucket default encryption with `aws_s3_bucket_server_side_encryption_configuration` and `sse_algorithm = "aws:kms:dsse"`, and noted that the backend should not override bucket defaults with `encrypt` or `kms_key_id`.
- The DSSE-KMS section could conflict with bucket policies that require explicit SSE request headers. I added a caveat that DSSE-KMS bucket-default mode should not be combined with a policy that denies PUT requests solely because the SSE header is absent.
- The OpenTofu AWS KMS key provider example omitted required `key_spec`. I added `key_spec = "AES_256"`.
- The native OpenTofu state encryption example did not mention the required migration path for an existing unencrypted state. I added a concise caveat that existing state should first be migrated with an `unencrypted` fallback block.

## Review Notes
The corrected KMS policy remains an illustrative example. In production, it should usually be narrowed further with conditions such as `kms:ViaService`, `kms:CallerAccount`, and an S3 encryption-context condition scoped to the state bucket.
