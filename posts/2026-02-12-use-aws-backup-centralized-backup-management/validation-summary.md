# Validation Summary: How to Use AWS Backup for Centralized Backup Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS CLI
- AWS KMS
- AWS IAM
- Amazon EventBridge
- Amazon SNS
- AWS Backup Audit Manager reports
- AWS Organizations backup policies

## Sources Consulted
- AWS Backup Developer Guide: What is AWS Backup? https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html
- AWS CLI Command Reference: create-backup-vault. https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-vault.html
- AWS CLI Command Reference: create-backup-plan. https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS Backup API Reference: BackupSelection. https://docs.aws.amazon.com/aws-backup/latest/devguide/API_BackupSelection.html
- AWS Backup Developer Guide: Continuous backups and point-in-time recovery. https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html
- AWS CLI Command Reference: list-backup-jobs. https://docs.aws.amazon.com/cli/latest/reference/backup/list-backup-jobs.html
- AWS Backup Developer Guide: Monitoring AWS Backup events using Amazon EventBridge. https://docs.aws.amazon.com/aws-backup/latest/devguide/eventbridge.html
- Amazon EventBridge User Guide: Resource-based policies. https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CLI Command Reference: create-report-plan. https://docs.aws.amazon.com/cli/latest/reference/backup/create-report-plan.html
- AWS Backup Developer Guide: Working with audit reports. https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-audit-reports.html
- AWS Organizations User Guide: Backup policies. https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html
- AWS CLI Command Reference: enable-policy-type. https://docs.aws.amazon.com/cli/latest/reference/organizations/enable-policy-type.html

## Issues Found
- The supported services list said "Amazon Timestream", but AWS Backup supports Amazon Timestream for LiveAnalytics and does not support Amazon Timestream for InfluxDB. Updated the wording to "Amazon Timestream for LiveAnalytics."
- The supported services list said "VMware on AWS", which was imprecise. Updated it to "VMware Cloud on AWS virtual machines."
- The vault explanation said each vault has its own encryption key. Backup vaults can use distinct keys, but uniqueness is not required. Changed this to "can use its own encryption key."
- The lifecycle examples claimed backups would move to cold storage but did not include `OptInToArchiveForSupportedResources`. Added that field to both lifecycle blocks and clarified that cold storage movement applies only to supported resource types.
- The tag-based selection description implied any tagged resource would be included. AWS Backup only backs up supported resources that are opted in. Updated the wording to "supported, opted-in resource."
- The continuous backup explanation omitted the 35-day maximum retention limit for AWS Backup PITR. Added that limit.
- The EventBridge-to-SNS CLI example omitted the need for an SNS topic resource policy allowing EventBridge to publish. Added a note after the command.
- The reporting section described the `BACKUP_JOB_REPORT` example as a compliance report. Changed the wording to audit/backup job reports and renamed the example report plan accordingly.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI command reference instead of local `--help` output.
- The examples use placeholder account IDs, ARNs, root IDs, backup plan IDs, and bucket names; readers must replace these with real values.
