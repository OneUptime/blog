# Validation Summary: EFS Backup Plans: Retention, Cross-Region Copies, and Vault Lock

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Amazon Elastic File System (EFS)
- AWS Backup plans, resource selections, recovery points, and cross-Region copies
- AWS Backup Vault Lock governance and compliance modes
- AWS IAM service roles and AWS KMS encryption
- AWS CLI, JSON configuration, and cron scheduling
- EFS restore operations and POSIX file ownership

## Sources Consulted
- [Backing up EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html) — incremental backups, consistency, completion windows, and cold-storage behavior.
- [AWS Backup feature availability](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html) — EFS incremental, cross-Region, cold-storage, and restore support; absence of EFS continuous PITR.
- [Supported AWS services](https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-supported-services.html) — restrictions on the automatic EFS backup vault.
- [create-backup-plan CLI reference](https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html) — plan schema, scheduling, windows, lifecycle fields, and copy actions.
- [create-backup-selection CLI reference](https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html) — resource-selection schema and command options.
- [Select AWS services to back up](https://docs.aws.amazon.com/aws-backup/latest/devguide/assigning-resources.html) — resource assignment and tag-selection opt-in behavior.
- [IAM service roles](https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html) — service-role permissions, trust, and role passing.
- [Encryption for backups](https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html) — vault encryption and KMS permissions.
- [Creating backup copies across AWS Regions](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html) — scheduled copies and destination configuration.
- [AWS Backup Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html) — lock modes, grace periods, existing recovery points, and empty-vault deletion.
- [put-backup-vault-lock-configuration CLI reference](https://docs.aws.amazon.com/cli/latest/reference/backup/put-backup-vault-lock-configuration.html) — flags, retention limits, and incompatible-job failures.
- [Restore an Amazon EFS file system](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html) — full and item-level restores and recovery-directory placement.
- [Managing mount targets](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html) — network access to restored EFS file systems.
- [DescribeRecoveryPoint API](https://docs.aws.amazon.com/aws-backup/latest/APIReference/API_DescribeRecoveryPoint.html) — resource identity and calculated lifecycle metadata.
- [Monitoring AWS Backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/monitoring.html) — operational monitoring facilities.
- [Author profile](https://github.com/nawazdhandala) — verified the linked profile resolves.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Both JSON examples parsed successfully, and all three Bash examples passed `bash -n`. Command names, flags, and configuration fields match the official AWS CLI reference.
- The daily cron expression schedules backups at 02:00 UTC by default. The 120-minute start window satisfies the documented minimum, and the 720-minute completion window is measured from job start.
- The primary 35-day retention and copy 90-day retention are valid warm-storage configurations. A 90-day copy satisfies the destination lock bounds of 90–365 days; a 35-day primary backup would fail against the same minimum.
- Omitting `--changeable-for-days` creates a governance lock. Compliance mode requires at least three days of grace time. Existing recovery-point lifecycles are not rewritten by new retention bounds.
- EFS backups are incremental recovery points, with no continuous PITR support. The consistency warning and recovery-directory restore guidance are supported by AWS documentation.
- The examples assume pre-created vaults, appropriate IAM role trust and permissions, KMS access, and replacement of sample account, role, file-system, and plan identifiers. The restore drill also requires suitable restore permissions and network access.
- No AWS resources were created and no live backup, copy, lock, or restore operations were performed. Validation covers documentation and local syntax; actual job success and recovery objectives still require the deployment checks described in the post.
- All links in the post resolved to their intended resources. No deprecated commands or version-specific incompatibilities were identified.
