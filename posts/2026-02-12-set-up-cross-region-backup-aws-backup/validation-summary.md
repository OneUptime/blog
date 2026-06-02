# Validation Summary: How to Set Up Cross-Region Backup with AWS Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS Backup backup plans, backup vaults, copy actions, recovery points, restore jobs
- AWS KMS
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- Amazon RDS restore metadata

## Sources Consulted
- AWS Backup Developer Guide: Creating backup copies across AWS Regions - https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html
- AWS Backup Developer Guide: Encryption for backups in AWS Backup - https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html
- AWS Backup Developer Guide: Monitoring AWS Backup events using Amazon EventBridge - https://docs.aws.amazon.com/aws-backup/latest/devguide/eventbridge.html
- AWS Backup Developer Guide: IAM service roles - https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWS Backup Developer Guide: Restore an RDS database - https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-rds.html
- AWS Backup Developer Guide: AWS Backup feature availability - https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html
- AWS CLI Command Reference: aws backup create-backup-plan - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI Command Reference: aws backup create-backup-selection - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html
- AWS CLI Command Reference: aws backup list-copy-jobs - https://docs.aws.amazon.com/cli/latest/reference/backup/list-copy-jobs.html
- AWS CLI Command Reference: aws backup create-backup-vault - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-vault.html

## Issues Found
- Corrected the destination vault access policy explanation. The original text said the DR vault needs a policy for cross-region copies generally; AWS documents vault access policies with `backup:CopyIntoBackupVault` as required for cross-account copies, while same-account cross-region copies typically rely on the AWS Backup IAM role permissions.
- Corrected the AWS Backup default service role ARN in the backup selection and restore examples from `arn:aws:iam::123456789012:role/AWSBackupServiceRole` to `arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole`, matching the AWS Backup default service role name and path.
- Corrected the lifecycle example that moved backups to cold storage after 7 days and deleted them after 90 days. AWS Backup requires backups transitioned to cold storage to remain there for at least 90 days, so the delete value was changed to 97 days.

## Review Notes
The examples use placeholder account IDs, plan IDs, recovery point ARNs, restore job IDs, SNS topic ARNs, and region names that readers must replace with their own values. AWS Backup cold storage and cross-region support varies by resource type, so teams should confirm feature availability for the specific protected resources before applying lifecycle settings.
