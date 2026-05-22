# Validation Summary: How to Implement Encryption at Rest with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS KMS
- Amazon S3
- Amazon RDS
- Amazon EBS
- Amazon EC2
- Amazon DynamoDB
- Amazon ElastiCache
- Amazon EFS
- Amazon SNS
- Amazon SQS
- Amazon CloudWatch Logs

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS KMS default key policy documentation: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS KMS pricing documentation: https://aws.amazon.com/kms/pricing/
- HashiCorp Terraform AWS provider documentation for `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon S3 bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- HashiCorp Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS encryption documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon RDS snapshot copy documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- HashiCorp Terraform AWS provider documentation for `aws_ebs_encryption_by_default` and `aws_ebs_default_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_encryption_by_default and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_default_kms_key
- HashiCorp Terraform AWS provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Amazon DynamoDB encryption at rest documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html
- HashiCorp Terraform AWS provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Amazon ElastiCache replication group API documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_ReplicationGroup.html
- HashiCorp Terraform AWS provider documentation for `aws_efs_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- HashiCorp Terraform AWS provider documentation for `aws_sns_topic` and `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- HashiCorp Terraform AWS provider documentation for `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Amazon CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html

## Issues Found
- The KMS policy example referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. Added the missing data source so the Terraform example is self-contained.
- The KMS key-user policy allowed cryptographic operations but did not allow grant operations for AWS services. Added `kms:CreateGrant`, `kms:ListGrants`, and `kms:RevokeGrant` with the `kms:GrantIsForAWSResource` condition, matching AWS KMS guidance for integrated AWS services that use grants.
- The AWS-managed key description said the keys are "Free." Updated it to "No monthly storage charge" because AWS does not charge for creation and storage of AWS-managed keys, but KMS request charges can still apply.
- The RDS Terraform example omitted required creation settings for a new PostgreSQL DB instance. Added `allocated_storage`, `username`, and `manage_master_user_password`.
- The RDS migration note said to create an encrypted snapshot directly from an unencrypted DB instance. Updated it to the documented flow: create a snapshot, copy it as encrypted, and restore from the encrypted copy.

## Review Notes
The S3 bucket policy intentionally requires upload requests to include SSE-KMS headers and the specified KMS key ARN; uploads that rely only on bucket default encryption would be denied. That is strict but technically valid for enforcing explicit client-side request headers.
