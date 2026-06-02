# Validation Summary: How to Set Up Cross-Account Backup with AWS Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS Organizations
- AWS Backup backup vaults and backup plans
- AWS KMS key policies
- AWS CLI
- AWS Backup organization backup policies
- IAM service roles

## Sources Consulted
- AWS Backup Developer Guide: Creating backup copies across AWS accounts - https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html
- AWS Backup API Reference: UpdateGlobalSettings - https://docs.aws.amazon.com/aws-backup/latest/devguide/API_UpdateGlobalSettings.html
- AWS CLI Command Reference: update-global-settings - https://docs.aws.amazon.com/cli/latest/reference/backup/update-global-settings.html
- AWS CLI Command Reference: create-backup-plan - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS Backup Developer Guide: BackupSelection and Condition API references - https://docs.aws.amazon.com/aws-backup/latest/devguide/API_BackupSelection.html and https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Condition.html
- AWS Organizations User Guide: Backup policy syntax and examples - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_syntax.html
- AWS Organizations User Guide: Best practices for using backup policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_best-practices.html
- AWS Backup Developer Guide: Feature availability - https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html
- AWS Backup Developer Guide: Encryption for backups in AWS Backup - https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html
- AWS Backup Developer Guide: IAM service roles - https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWS CLI Command Reference: list-copy-jobs and list-recovery-points-by-backup-vault - https://docs.aws.amazon.com/cli/latest/reference/backup/list-copy-jobs.html and https://docs.aws.amazon.com/cli/latest/reference/backup/list-recovery-points-by-backup-vault.html

## Issues Found
- The post used `aws backup update-region-settings` as the command to enable cross-account backup. AWS documents cross-account backup as an organization-level global setting enabled through `update-global-settings` with `isCrossAccountBackupEnabled=true`, so the command was replaced.
- The post said the cross-account backup feature could be enabled from a delegated administrator. AWS documents `UpdateGlobalSettings` as requiring the AWS Organizations management account, so the wording was narrowed to the management account.
- The backup plan copy action moved recovery points to cold storage after 7 days and deleted them after 90 days. AWS Backup requires `DeleteAfterDays` to be at least 90 days after `MoveToColdStorageAfterDays`, so the deletion value was changed to 120 days.
- The organization backup policy copy action omitted the required `target_backup_vault_arn` field inside the copy action. The policy example now includes `target_backup_vault_arn` with the destination vault ARN.
- The examples used `AWSBackupServiceRole` as if it were the default AWS Backup role. AWS documents the default role as `AWSBackupDefaultServiceRole` under `role/service-role/`, so the backup selection, organization policy, and restore examples were updated to that ARN path.
- The RDS restore example omitted the resource type and engine metadata. The example now includes `--resource-type RDS` and an `Engine` value, matching AWS Backup restore metadata expectations more closely.

## Review Notes
The examples still use placeholder account IDs, vault names, backup plan IDs, KMS keys, recovery point ARNs, and RDS restore metadata. In a real environment, operators should retrieve the exact backup plan ID, recovery point ARN, and restore metadata for the selected recovery point before running the commands.
