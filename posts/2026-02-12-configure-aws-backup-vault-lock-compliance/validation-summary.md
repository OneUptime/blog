# Validation Summary: How to Configure AWS Backup Vault Lock for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Backup
- AWS Backup Vault Lock
- AWS Backup backup vaults and backup plans
- AWS KMS
- AWS IAM resource-based policies
- AWS Organizations service control policies
- Amazon EventBridge
- AWS CloudTrail

## Sources Consulted
- AWS Backup Vault Lock: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS CLI `put-backup-vault-lock-configuration`: https://docs.aws.amazon.com/cli/latest/reference/backup/put-backup-vault-lock-configuration.html
- AWS Backup `DeleteBackupVaultLockConfiguration` API: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_DeleteBackupVaultLockConfiguration.html
- AWS Backup `Lifecycle` API: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup `BackupRule` API: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_BackupRule.html
- AWS CLI `create-backup-plan`: https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS Backup vault access policies: https://docs.aws.amazon.com/aws-backup/latest/devguide/create-a-vault-access-policy.html
- AWS Backup service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsbackup.html
- Amazon EventBridge AWS Backup events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-backup.html
- AWS CLI `events put-rule`: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI `events put-targets`: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- HHS HIPAA retention FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- 45 CFR 164.316 documentation retention text: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.316

## Issues Found
- The governance mode explanation referenced a non-existent `backup:vault-lock-governance-bypass` condition key and implied direct delete bypass. Updated it to match AWS documentation: governance-mode vault locks can be removed or changed by users with sufficient IAM permissions.
- The post described `MinRetentionDays` as the point before which recovery points cannot be deleted. Updated the wording to clarify that min/max retention settings constrain future backup and copy jobs, while recovery points are retained according to their lifecycle retention periods.
- The KMS key example manually constructed a key ARN from `KeyId`, Region, and account placeholders. Updated it to query `KeyMetadata.Arn` directly, which is less error-prone and works with the actual account and Region used by the command.
- The backup-plan section said backup plans themselves must respect retention constraints and that the sample plan creation would fail. AWS documentation describes nonconforming backup and copy jobs as failing, so the wording was corrected.
- The monitoring example called the command a CloudWatch alarm, but it creates an EventBridge rule. Updated the comment.
- The EventBridge rule omitted `detail.eventSource` and did not set `--state ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`. Added both so the rule matches AWS Backup API calls delivered through CloudTrail management events.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI and AWS service documentation. The compliance mapping table is a high-level operational mapping, not legal advice; actual retention periods should be confirmed against the organization's regulatory scope and record-retention policy.
