# Validation Summary: How to Restore Resources from AWS Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS CLI
- Amazon EBS
- Amazon RDS
- Amazon DynamoDB
- Amazon EFS
- Amazon EC2
- Point-in-time recovery

## Sources Consulted
- AWS Backup Developer Guide: Restore a backup by resource type - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-a-backup.html
- AWS Backup Developer Guide: Restore an Amazon EBS volume - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-ebs.html
- AWS Backup Developer Guide: Restore an Amazon RDS database - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-rds.html
- AWS Backup Developer Guide: Continuous backups and point-in-time recovery - https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html
- AWS Backup Developer Guide: Restore a Amazon DynamoDB table - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-dynamodb.html
- AWS Backup Developer Guide: Restore an Amazon EFS file system - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html
- AWS Backup Developer Guide: Restore an Amazon EC2 instance - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-ec2.html
- AWS CLI Command Reference: start-restore-job - https://docs.aws.amazon.com/cli/latest/reference/backup/start-restore-job.html
- AWS CLI Command Reference: get-recovery-point-restore-metadata - https://docs.aws.amazon.com/cli/latest/reference/backup/get-recovery-point-restore-metadata.html
- AWS CLI Command Reference: list-recovery-points-by-backup-vault - https://docs.aws.amazon.com/cli/latest/reference/backup/list-recovery-points-by-backup-vault.html
- AWS CLI Command Reference: list-recovery-points-by-resource - https://docs.aws.amazon.com/cli/latest/reference/backup/list-recovery-points-by-resource.html
- AWS CLI Command Reference: restore-table-to-point-in-time - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-to-point-in-time.html

## Issues Found
- Replaced nonexistent `aws backup list-recovery-points-by-resource-arn` with the current `aws backup list-recovery-points-by-resource` command.
- Changed the EBS metadata lookup from `describe-recovery-point` to `get-recovery-point-restore-metadata`, which is the AWS Backup API/CLI operation for restore metadata.
- Replaced the unsupported restored-volume tag lookup with `describe-restore-job` and `CreatedResourceArn`, which AWS Backup returns for completed restore jobs.
- Removed the invalid `RecoveryPointType == CONTINUOUS` query because `list-recovery-points-by-backup-vault` does not return that field.
- Added required RDS PITR metadata fields `Engine` and `UseLatestRestorableTime` based on AWS Backup's RDS PITR CLI examples.
- Changed DynamoDB restore encryption metadata from `AWS_OWNED_KMS_KEY` to `Default`, which is the documented value for AWS-owned key encryption in AWS Backup DynamoDB restore metadata.
- Replaced the AWS Backup DynamoDB PITR restore example with the native `aws dynamodb restore-table-to-point-in-time` command because AWS Backup's DynamoDB restore metadata does not document `restoreDateTime`.
- Corrected the EFS restore wording and example: existing-file-system restores go into an AWS-created recovery directory, and `ItemsToRestore` must use explicit paths, not wildcards such as `/*`.
- Removed `file-system-id` from the new EFS file system restore example because AWS documents it as not required and ignored when `newFileSystem` is `true`.

## Review Notes
AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI and AWS Backup documentation. The post uses placeholder ARNs, IDs, and resource names; these remain illustrative and must be replaced before running the commands.
