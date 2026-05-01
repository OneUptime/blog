# Validation Summary: How to Enforce Encryption Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS KMS
- Amazon S3
- Amazon RDS for PostgreSQL
- Amazon EBS
- AWS Config
- HCL

## Sources Consulted
- OpenTofu custom conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu lifecycle blocks: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- AWS KMS default key policy: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS KMS key policies: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- Amazon S3 SSE-KMS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Amazon S3 bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 Bucket Keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- Amazon RDS PostgreSQL SSL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Amazon RDS KMS key management: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.Keys.html
- Amazon RDS parameter groups overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/parameter-groups-overview.html
- Associating a DB parameter group with a DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.Associating.html
- Amazon EBS encryption by default: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- AWS Config `S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config `RDS_STORAGE_ENCRYPTED`: https://docs.aws.amazon.com/config/latest/developerguide/rds-storage-encrypted.html
- AWS Config `EC2_EBS_ENCRYPTION_BY_DEFAULT`: https://docs.aws.amazon.com/config/latest/developerguide/ec2-ebs-encryption-by-default.html

## Issues Found
- The custom KMS key policy example was not a reliable working pattern for S3, RDS, and Secrets Manager. AWS KMS documents the default account-enabling key policy plus IAM/key-user permissions and grant permissions for integrated services, while RDS specifically requires `kms:CreateGrant` and `kms:DescribeKey` patterns that were not reflected in the snippet. I removed the incorrect inline policy block so the example no longer presents an unsafe or incomplete key policy.
- The S3 bucket policy used `StringNotEquals` on `s3:x-amz-server-side-encryption = "aws:kms"`, which does not enforce use of the intended customer-managed KMS key. AWS’s documented pattern for requiring a specific KMS key is `ArnNotEqualsIfExists` on `s3:x-amz-server-side-encryption-aws-kms-key-id`. I updated the statement to match the official example.
- The RDS SSL example created a custom parameter group but did not attach it to the DB instance, so `rds.force_ssl` would not actually be enforced. I added `parameter_group_name = aws_db_parameter_group.ssl_required.name`.
- The RDS snippet used a PostgreSQL parameter group family without pinning a compatible DB engine major version. AWS documents that parameter groups are tied to engine/version families. I set `engine_version = "16"` and updated the parameter group family to `postgres16` so the example is internally consistent.
- The `lifecycle` precondition checked `var.storage_encrypted`, but the resource itself hard-coded `storage_encrypted = true`, making the example inconsistent and dependent on an undeclared variable. I removed the incorrect precondition block.
- The EBS best-practice text said encryption by default is enforced “at the account level.” AWS documents this as a Region-specific setting. I corrected the text to “in each Region” and clarified that it covers new volumes and snapshot copies in that Region.
- The S3 Bucket Key savings claim said it reduces KMS API calls by 99%. AWS documents this as reducing AWS KMS request costs by up to 99 percent. I corrected the wording accordingly.
- The KMS rotation best-practice text said to enable rotation on “all KMS keys.” AWS documents automatic rotation as supported only for symmetric customer-managed keys with AWS-managed key material. I narrowed the statement to the supported key type and noted the default 365-day rotation period.

## Review Notes
- The code blocks are focused snippets, not full standalone modules. Supporting resources such as the S3 bucket itself and other required RDS instance arguments are assumed to exist elsewhere in the configuration.
- Amazon S3 has automatically applied SSE-S3 to new uploads since January 5, 2023. The post remains relevant because it is specifically about enforcing SSE-KMS and customer-managed KMS key usage rather than relying on baseline S3-managed encryption.
