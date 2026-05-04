# Validation Summary: How to Create AWS Backup Vaults with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Backup (`aws_backup_vault`, `aws_backup_vault_policy`, `aws_backup_vault_lock_configuration`, `aws_backup_vault_notifications`)
- AWS KMS (`aws_kms_key`, `aws_kms_alias`)
- AWS IAM (policy JSON)
- AWS SNS (referenced for notifications)

## Sources Consulted
- AWS Backup Vault Lock developer guide: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS Backup PutBackupVaultLockConfiguration API reference: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_PutBackupVaultLockConfiguration.html
- Terraform AWS provider docs for `aws_backup_vault`, `aws_backup_vault_policy`, `aws_backup_vault_lock_configuration`, `aws_backup_vault_notifications`, `aws_kms_key`, `aws_kms_alias`
- AWS Backup vault notification event types reference

## Issues Found
- **Incorrect description of `changeable_for_days`**: The original comment stated "Set to 0 to make it immediately permanent (irreversible)" and "Set to 1-3 for initial setup with ability to correct". This is technically incorrect — AWS enforces a minimum value of 3 (a 72-hour cooling-off period). Values of 0, 1, or 2 will return an error. Additionally, omitting the argument entirely creates the lock in *governance* mode (removable by privileged IAM users), not compliance mode. Replaced the comment with an accurate description of the minimum value, the cooling-off behavior, and what happens when the argument is omitted.

## Review Notes
- The `Sid = "AllowBackupService"` statement uses an IAM role principal (`aws_iam_role.backup.arn`) rather than the AWS Backup service principal (`backup.amazonaws.com`). The naming is slightly misleading but the configuration itself is valid — it grants permissions to a backup-related IAM role. Left as-is since it's a stylistic concern, not a technical error.
- The `backup:GetRecoveryPointRestoreMetadata` action appears in both the `AllowBackupService` and `AllowRestore` statements. Mildly redundant but not incorrect.
- Resource and argument names (`aws_backup_vault.kms_key_arn`, `aws_backup_vault_policy.backup_vault_name`, `aws_backup_vault_notifications.backup_vault_events`, etc.) all match the current Terraform AWS provider schema.
- The `backup_vault_events` values (`BACKUP_JOB_FAILED`, `RESTORE_JOB_FAILED`, `COPY_JOB_FAILED`) are valid AWS Backup notification event types.
- The post references `aws_iam_role.backup`, `aws_iam_role.restore`, `aws_iam_role.vault_admin`, `aws_kms_key.backup_dr`, and `aws_sns_topic.backup_alerts` without defining them; readers are expected to provide these themselves, consistent with a focused tutorial.
- HCL comments inside `jsonencode({...})` are valid because `jsonencode` operates on an HCL value (comments are stripped before serialization).
