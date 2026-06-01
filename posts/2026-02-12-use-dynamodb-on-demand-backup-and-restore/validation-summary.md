# Validation Summary: How to Use DynamoDB On-Demand Backup and Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB on-demand backups
- Amazon DynamoDB point-in-time recovery (PITR)
- AWS CLI
- Boto3 for Python
- AWS Lambda
- Amazon EventBridge
- AWS Backup
- DynamoDB Global Tables

## Sources Consulted
- Amazon DynamoDB Developer Guide: Backup and restore for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Backup-and-Restore.html
- Amazon DynamoDB Developer Guide: Backing up and restoring DynamoDB tables with DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CreateBackup.html
- Amazon DynamoDB Developer Guide: Enable point-in-time recovery in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery_Howitworks.html
- AWS CLI Command Reference: dynamodb create-backup - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-backup.html
- AWS CLI Command Reference: dynamodb list-backups - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/list-backups.html
- AWS CLI Command Reference: dynamodb restore-table-from-backup - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-from-backup.html
- AWS CLI Command Reference: dynamodb restore-table-to-point-in-time - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-to-point-in-time.html
- AWS CLI Command Reference: backup create-backup-plan - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI Command Reference: backup create-backup-selection - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Boto3 DynamoDB client reference: list_backups - https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/client/list_backups.html
- Boto3 DynamoDB client reference: create_backup - https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/client/create_backup.html
- Python 3.12 documentation: What's New, datetime utcnow deprecation - https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The backup contents description said on-demand backups capture encryption settings. AWS documents backup contents as table data plus GSIs, LSIs, streams, and provisioned throughput; encryption can be overridden during restore, but is not listed as a captured backup component. Removed encryption settings from that sentence.
- The restore caveat omitted several settings AWS says must be manually configured on a restored table. Added stream settings, TTL settings, deletion protection settings, and PITR settings to the list.
- The Lambda sample used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The Lambda cleanup code called `list_backups` only once even though DynamoDB returns paginated backup results. Added pagination with `LastEvaluatedBackupArn` and `ExclusiveStartBackupArn`.
- The Lambda sample did not handle same-day reruns where a backup with the generated name already exists or is in use. Added explicit handling for `BackupInUseException`.

## Review Notes
The CLI examples and AWS Backup JSON structures are current according to the AWS CLI documentation. The post's EventBridge target syntax matches the AWS CLI examples. AWS Backup for DynamoDB may require DynamoDB/AWS Backup features and resource opt-in to be enabled in the account before the backup plan is useful.
