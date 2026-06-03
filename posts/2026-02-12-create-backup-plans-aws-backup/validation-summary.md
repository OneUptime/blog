# Validation Summary: How to Create Backup Plans with AWS Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Backup
- AWS Backup backup plans and backup rules
- AWS Backup lifecycle policies and cold storage
- AWS Backup resource selections
- AWS CLI
- AWS cron expressions

## Sources Consulted
- AWS Backup Developer Guide: Lifecycle - https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup Developer Guide: Backup plan options and configuration - https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html
- AWS Backup Developer Guide: Continuous backups and point-in-time recovery - https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html
- AWS Backup Developer Guide: Create a backup plan - https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html
- AWS CLI Command Reference: create-backup-plan - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI Command Reference: create-backup-selection - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html
- AWS CLI Command Reference: create-backup-vault - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-vault.html
- AWS CLI Command Reference: list-backup-jobs - https://docs.aws.amazon.com/cli/latest/reference/backup/list-backup-jobs.html

## Issues Found
- The weekly tiered-retention rule moved recovery points to cold storage after 30 days but deleted them after 90 days. AWS Backup requires `DeleteAfterDays` to be at least 90 days greater than `MoveToColdStorageAfterDays` for backups transitioned to cold storage, so the weekly rule was changed to delete after 120 days and the surrounding explanation was updated.
- The cold-storage explanation said only that backups have a 90-day minimum storage duration. It was clarified that the 90-day minimum applies after transition to cold storage and that AWS Backup enforces this through the relationship between `MoveToColdStorageAfterDays` and `DeleteAfterDays`.
- The continuous backup rule included a `ScheduleExpression`. AWS Backup documentation states that continuous backups and PITR cannot be scheduled with a time or cron expression, so the schedule was removed from that rule.
- The validation command used `aws backup list-backup-jobs --by-backup-plan-id`, but `list-backup-jobs` does not support that option in the AWS CLI. The command was changed to use `--query` against the returned `CreatedBy.BackupPlanId` field and the comment was updated to describe recent backup jobs rather than the next scheduled backup time.

## Review Notes
The local environment did not have the AWS CLI installed, so command validation was performed against the current official AWS CLI command reference rather than local `aws --help` output.
