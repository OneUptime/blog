# EFS Backup Plans: Retention, Cross-Region Copies, and Vault Lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Backup, Disaster Recovery

Description: Build an EFS backup plan with explicit resource selection, retention, cross-Region copies, and tested Vault Lock settings.

An EFS backup plan is useful only if it selects the intended file system, produces retained recovery points, and leaves a usable restore path. A successful plan-creation API call establishes none of those outcomes by itself.

This example protects one EFS file system with daily backups retained for 35 days and a separate cross-Region copy retained for 90 days. The numbers are illustrative; choose them from your recovery requirements and measured backup duration.

## Understand what incremental means

EFS backups begin with a full copy, followed by incremental backups of changes. AWS Backup retains the references needed to restore a retained recovery point, so operators do not manually assemble an incremental chain. This is scheduled recovery-point protection, not continuous point-in-time recovery for every intervening write. [EFS backup behavior](https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html), [AWS Backup feature support](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html).

Also establish the application's consistency requirements. A file tree modified during backup can contain inconsistent application state. For a database or multi-file transaction format, use its supported checkpoint/export procedure or coordinate a quiet backup window. A file-system backup is not automatically an application-consistent database backup.

## Prepare dedicated vaults and permissions

Create a normal vault such as `efs-primary` in `us-east-1` and `efs-dr` in `us-west-2`. Configure their encryption keys and access policies, and provide a backup service role with the necessary EFS, backup, and KMS permissions. The operator also needs permission to pass that role.

Do not reuse `aws/efs/automatic-backup-vault` for a custom plan or cross-account copies: AWS reserves it for EFS automatic backups. Keep automatic protection in place while proving the replacement plan. [AWS Backup supported-service considerations](https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-supported-services.html).

## Create the plan and resource selection

Save this as `efs-backup-plan.json`, replacing the account number and existing destination vault ARN:

```json
{
  "BackupPlanName": "efs-daily-with-dr-copy",
  "Rules": [
    {
      "RuleName": "daily",
      "TargetBackupVaultName": "efs-primary",
      "ScheduleExpression": "cron(0 2 ? * * *)",
      "StartWindowMinutes": 120,
      "CompletionWindowMinutes": 720,
      "Lifecycle": {"DeleteAfterDays": 35},
      "CopyActions": [
        {
          "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:111122223333:backup-vault:efs-dr",
          "Lifecycle": {"DeleteAfterDays": 90}
        }
      ]
    }
  ]
}
```

The schedule is UTC unless a schedule timezone is explicitly set. A completion window is a deadline after the job starts, not a promise that it finishes in that duration. [CreateBackupPlan parameters](https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html).

```bash
aws backup create-backup-plan \
  --region us-east-1 \
  --backup-plan file://efs-backup-plan.json
```

Copy the returned plan ID. Then save `efs-backup-selection.json`:

```json
{
  "SelectionName": "production-efs",
  "IamRoleArn": "arn:aws:iam::111122223333:role/efs-backup-role",
  "Resources": [
    "arn:aws:elasticfilesystem:us-east-1:111122223333:file-system/fs-0123456789abcdef0"
  ]
}
```

```bash
aws backup create-backup-selection \
  --region us-east-1 \
  --backup-plan-id REPLACE_WITH_PLAN_ID \
  --backup-selection file://efs-backup-selection.json
```

Explicit selection makes this first rollout easy to audit. If switching to tag selection later, verify the resulting resource set and the service opt-in settings. A plan without an effective selection does not back up the intended resource.

## Prove copies and retention before locking

Wait for an actual scheduled backup and its copy to complete. Inspect both jobs, list recovery points in each vault, and verify their resource ARN and calculated expiration. A source backup can succeed while its copy fails independently. [Cross-Region backup copies](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html).

This example keeps backups warm. If adding cold-storage lifecycle rules, check EFS-specific behavior and minimum retention requirements first. Do not confuse EFS IA/Archive storage classes with AWS Backup's own cold tier. They are separate policies and billing mechanisms.

## Add Vault Lock with compatible bounds

For an initial governance lock on the destination vault:

```bash
aws backup put-backup-vault-lock-configuration \
  --region us-west-2 \
  --backup-vault-name efs-dr \
  --min-retention-days 90 \
  --max-retention-days 365
```

Governance mode permits authorized removal of the lock. Compliance mode adds `--changeable-for-days`, with a minimum three-day grace period. After that period, the lock cannot be changed or removed. The vault itself can be deleted only when it is empty. Make that irreversible retention decision only after testing actual backup and restore behavior. Lock bounds constrain new jobs; they do not rewrite existing recovery-point lifecycles. [AWS Backup Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html).

For this example, the 90-day copy fits the destination's bounds. Applying the same 90-day minimum to the 35-day primary rule would make new primary jobs fail. Review every rule and copy action targeting a vault before locking it.

## Finish with a restore drill

Restore a destination recovery point to an isolated EFS file system, create the needed mount targets, and verify representative file contents and POSIX ownership as the application user. AWS Backup places restored files beneath a recovery directory, so check the path before declaring files missing. [EFS restores](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html).

Record backup age, copy delay, restore duration, and the application-level checks that passed. Monitor failed, expired, and missing backup/copy jobs separately. The completed plan is a tested recovery process with enforced retention, not just a recurring schedule.
