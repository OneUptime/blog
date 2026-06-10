# Validation Summary: How to Back Up DynamoDB Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB (on-demand backups, Point-in-Time Recovery, exports)
- AWS Backup service
- AWS CLI (`aws dynamodb` commands)
- Python (boto3 SDK)
- Bash scripting
- Terraform (`aws_backup_vault`, `aws_backup_plan`, `aws_backup_selection`, `aws_iam_role`)
- AWS Lambda (Python runtime)
- AWS CloudFormation
- Amazon SNS
- Amazon S3
- Amazon EventBridge

## Sources Consulted
- AWS DynamoDB Developer Guide — Backup and restore: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html
- AWS DynamoDB Developer Guide — Point-in-time recovery (PITR): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html
- AWS DynamoDB Developer Guide — DynamoDB data export to S3: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html
- boto3 DynamoDB client reference (`create_backup`, `describe_backup`, `list_backups`, `delete_backup`, `update_continuous_backups`, `describe_continuous_backups`, `restore_table_from_backup`, `restore_table_to_point_in_time`, `export_table_to_point_in_time`, `describe_export`, `list_tags_of_resource`): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- AWS CLI Command Reference — `aws dynamodb create-backup`, `describe-backup`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/
- AWS Backup Developer Guide and IAM managed policies (`AWSBackupServiceRolePolicyForBackup`, `AWSBackupServiceRolePolicyForRestores`): https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- Terraform AWS Provider docs — `aws_backup_vault`, `aws_backup_plan`, `aws_backup_selection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS Lambda supported runtimes (Python 3.11): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS EventBridge schedule expressions (cron syntax): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html

## Issues Found
- **Missing `timedelta` import in `DynamoDBExporter`.** The class declared `from datetime import datetime, timezone`, but the `INCREMENTAL_EXPORT` branch of `export_table_to_s3` calls `datetime.now(timezone.utc) - timedelta(days=1)` and `datetime.now(timezone.utc)` for `ExportFromTime`/`ExportToTime`. Without `timedelta` in scope, that branch would raise `NameError` at runtime. Changed the import to `from datetime import datetime, timedelta, timezone` so the incremental export path actually works as documented.

## Review Notes
- The boto3 API names and parameter shapes used throughout match current `botocore`/`boto3` definitions: `create_backup` / `describe_backup` / `list_backups` / `delete_backup`, `update_continuous_backups` with `PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled`, `describe_continuous_backups` returning `ContinuousBackupsDescription.PointInTimeRecoveryDescription` (with `EarliestRestorableDateTime` / `LatestRestorableDateTime`), `restore_table_from_backup` (with `BillingModeOverride`, `ProvisionedThroughputOverride`, `GlobalSecondaryIndexOverride`, `LocalSecondaryIndexOverride`, `SSESpecificationOverride`), `restore_table_to_point_in_time` (with `UseLatestRestorableTime` / `RestoreDateTime`), and `export_table_to_point_in_time` (with `ExportFormat`, `ExportType`, `IncrementalExportSpecification.ExportViewType` of `NEW_AND_OLD_IMAGES`). All verified against current boto3 documentation.
- AWS CLI usages (`aws dynamodb create-backup --table-name --backup-name --query 'BackupDetails.BackupArn'`, `aws dynamodb describe-backup --backup-arn --query 'BackupDescription.BackupDetails.BackupStatus'`) match the documented response shapes.
- AWS managed policy ARNs `AWSBackupServiceRolePolicyForBackup` and `AWSBackupServiceRolePolicyForRestores` are correct and current.
- Terraform `aws_backup_*` resources use valid syntax for AWS provider v5.x: `rule { ... lifecycle { cold_storage_after, delete_after } copy_action { ... } recovery_point_tags }` and `aws_backup_selection { selection_tag { type, key, value } }` are all valid.
- EventBridge / AWS Backup cron expression `cron(0 3 * * ? *)` uses the correct six-field AWS cron syntax (with `?` rather than `*` for day-of-month/day-of-week pairs).
- The Backup Strategy Comparison table is a deliberate simplification. Notably, since 2023–2024 AWS Backup and recent DynamoDB updates allow cross-Region and cross-Account restore for both on-demand and PITR via AWS Backup, so the "No" cells for direct PITR cross-Region/cross-Account are arguable but defensible if the row is read as "what each mechanism does on its own without AWS Backup." Left as-is to preserve author intent.
- `validate_restore` uses `DescribeTable.Table.ItemCount`, which the boto3/DynamoDB docs explicitly describe as approximate and refreshed roughly every six hours. The code's docstring already calls this out ("approximate item count"), but readers should be aware that a strict equality check between source and just-restored tables can spuriously fail until both counts settle.
- The `DynamoDBExporter` initializes an unused `self.s3 = boto3.client('s3', ...)` — harmless, not technically wrong.
- Python 3.11 Lambda runtime, used in the CloudFormation template, is still a supported AWS Lambda runtime as of the review date.
