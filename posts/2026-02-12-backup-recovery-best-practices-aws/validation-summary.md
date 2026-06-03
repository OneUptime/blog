# Validation Summary: How to Implement Backup and Recovery Best Practices on AWS

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS Backup
- AWS Backup Vault Lock
- Amazon RDS for PostgreSQL
- Amazon DynamoDB
- Amazon S3 Cross-Region Replication
- AWS Lambda with Boto3
- Amazon CloudWatch alarms
- Terraform AWS provider
- AWS CloudFormation

## Sources Consulted
- AWS Backup Vault Lock documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS Backup CloudWatch metrics documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/cloudwatch.html
- Terraform AWS provider `aws_backup_plan` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS provider `aws_backup_vault_lock_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault_lock_configuration
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Amazon RDS backup retention documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- AWS Prescriptive Guidance for Amazon RDS backup and recovery: https://docs.aws.amazon.com/prescriptive-guidance/latest/backup-recovery/rds.html
- Amazon S3 replication documentation for KMS-encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- Boto3 RDS `restore_db_instance_from_db_snapshot` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/restore_db_instance_from_db_snapshot.html
- Boto3 RDS `delete_db_instance` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/delete_db_instance.html
- DynamoDB point-in-time recovery documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Referenced OneUptime links were checked and resolved: https://oneuptime.com/blog/post/2026-02-12-data-protection-best-practices-aws/view and https://oneuptime.com/blog/post/2026-02-12-multi-account-strategy-aws/view

## Issues Found
- The AWS Backup vault lock used `min_retention_days = 7` while the hourly backup rule and cross-region copy retained recovery points for only 1 day. AWS Backup Vault Lock rejects backup and copy jobs whose lifecycle retention is shorter than the configured minimum. Changed `min_retention_days` to `1` so the 24-hour hourly retention example is valid.
- The daily AWS Backup rule used `cold_storage_after = 7` with `delete_after = 30`. AWS Backup lifecycle rules require `delete_after` to be at least 90 days greater than `cold_storage_after`. Removed the cold-storage transition from the 30-day daily rule and its copy action so the stated 30-day retention remains accurate and valid.
- The RDS Terraform snippet used `delete_automated_backups_on_termination`, which is not the current `aws_db_instance` argument. Replaced it with `delete_automated_backups = false`.
- The RDS Terraform snippet did not include required creation fields for a new DB instance. Added `allocated_storage`, `db_name`, `username`, and `manage_master_user_password = true` so the example can create an encrypted PostgreSQL instance without embedding a plaintext password.
- The S3 replication rule enabled `delete_marker_replication`, which is valid only with a V2 replication configuration. Added `filter {}` to make the all-objects rule an explicit V2 replication rule.

## Review Notes
- The snippets still assume supporting resources exist, including KMS keys, IAM roles and policies, provider aliases, backup vaults in the DR region, subnet groups, security groups, SNS topics, and Lambda scheduling. That is acceptable for a focused blog post, but readers need those prerequisites for a complete deployment.
- RDS PITR is correctly described as restorable to any second within the retention period, but the latest restorable time is typically several minutes behind current time.
