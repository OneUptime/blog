# Validation Summary: How to Use KMS with S3 for Encryption

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon S3 server-side encryption
- AWS Key Management Service (AWS KMS)
- SSE-S3, SSE-KMS, DSSE-KMS, and SSE-C
- S3 Bucket Keys
- AWS CLI
- Terraform AWS Provider
- IAM, KMS key policies, and S3 bucket policies
- S3 Inventory and S3 Batch Operations

## Sources Consulted
- Amazon S3 User Guide: Using server-side encryption with AWS KMS keys (SSE-KMS): https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Amazon S3 User Guide: Specifying server-side encryption with AWS KMS (SSE-KMS): https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-kms-encryption.html
- Amazon S3 User Guide: Reducing the cost of SSE-KMS with Amazon S3 Bucket Keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- Amazon S3 User Guide: Using server-side encryption with Amazon S3 managed keys (SSE-S3): https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- Amazon S3 User Guide: Using dual-layer server-side encryption with AWS KMS keys (DSSE-KMS): https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingDSSEncryption.html
- AWS CLI Command Reference: s3api put-bucket-encryption: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- AWS CLI Command Reference: s3api copy-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- AWS CLI Command Reference: s3api put-bucket-inventory-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-inventory-configuration.html
- AWS CLI Command Reference: s3 cp: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI Command Reference: kms create-key: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS KMS Developer Guide: Request quotas: https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html
- AWS IAM User Guide: Condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- Terraform Registry: aws_kms_key resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform Registry: aws_s3_bucket_server_side_encryption_configuration resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration

## Issues Found
- Replaced outdated "CMK" wording with "customer managed KMS key" where the post was describing current AWS KMS terminology. AWS has replaced "customer master key" terminology with "KMS key."
- Changed the default bucket encryption CLI example to use a full KMS key ARN instead of a bare alias. AWS CLI documentation recommends a fully qualified KMS key ARN for customer managed KMS keys in S3 default encryption because aliases can resolve in the requester's account.
- Added missing Terraform `aws_caller_identity` and `aws_region` data source declarations. The Terraform snippet referenced both data sources but did not declare them.
- Updated the KMS quota range from 5,500-30,000 requests/second to 10,000-100,000 symmetric cryptographic requests/second depending on Region, based on current AWS KMS quotas.
- Corrected the bucket policy example. The original `StringNotEquals` conditions would also deny requests that omit encryption headers and rely on default bucket encryption, contradicting the CLI example. The updated policy blocks explicit non-KMS settings, explicit SSE-KMS requests without a key ID, and explicit wrong-key uploads while still allowing default bucket encryption to apply when headers are omitted.
- Changed explicit AWS CLI upload examples to use the KMS key ARN instead of the alias.
- Replaced the single-object re-encryption example with `aws s3api copy-object`, which directly matches the AWS documented CopyObject operation for changing encryption on an existing object.
- Corrected the Region guidance. The post said cross-region KMS calls add latency, but Amazon S3 bucket encryption requires the KMS key to be in the same AWS Region as the bucket.

## Review Notes
The local AWS CLI was not installed in the workspace, so command validation was performed against official AWS CLI command reference pages instead of local `--help` output. The post's OneUptime internal links were plausible and consistent with the referenced related post slugs, but they were not required for the technical corrections.
