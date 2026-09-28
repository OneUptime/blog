# Copy EFS Backups Across Accounts and Regions and Verify Restores

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Backup, Disaster Recovery

Description: Copy EFS recovery points across accounts and Regions, verify the destination copy, and prove recovery with an isolated restore drill.

A backup copy provides protection only if the recovery account can decrypt it, restore it, and start the application with the recovered files. Seeing a recovery-point ARN in another Region is useful evidence, but it is not the end of the test.

This walkthrough uses a source account in `us-east-1` and a recovery account in `us-west-2`. Both belong to the same AWS Organization. Use named CLI profiles to keep account context visible throughout the procedure.

## Prepare both sides

EFS supports cross-account and cross-Region copies in AWS Backup, subject to the availability of those features in the selected Regions. Check the [feature matrix](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html) before adopting a new Region.

The organization management account must enable cross-account backup. Create a normal destination vault, configure encryption and retention, and authorize the source to copy into it. The source copy role needs the relevant identity permissions; the destination vault also needs a resource policy allowing `backup:CopyIntoBackupVault`. Cross-account copy authorization requires both sides. [Cross-account backup configuration](https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html).

A narrowly scoped destination vault policy can identify the source account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::111122223333:root"},
      "Action": "backup:CopyIntoBackupVault",
      "Resource": "*"
    }
  ]
}
```

This permits the account to delegate that copy action; it does not grant every identity in the account unrestricted access. Apply it to the intended destination vault and retain any required existing policy statements.

Check KMS policies and grants as a separate layer. EFS is fully managed by AWS Backup for backup encryption, and copies use the destination vault key. Customer-managed keys make key ownership and recovery-role access explicit; configure permissions for the particular source and destination key setup rather than assuming a vault policy grants decryption. [Backup encryption](https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html).

## Copy an existing retained recovery point

Choose a completed warm recovery point in a custom source vault. AWS does not support cross-account copying from the cold tier, and the automatic EFS vault is reserved for its automatic backups.

```bash
aws backup start-copy-job \
  --profile production --region us-east-1 \
  --recovery-point-arn REPLACE_WITH_SOURCE_RECOVERY_POINT_ARN \
  --source-backup-vault-name efs-primary \
  --destination-backup-vault-arn arn:aws:backup:us-west-2:444455556666:backup-vault:efs-dr \
  --iam-role-arn arn:aws:iam::111122223333:role/efs-backup-copy-role \
  --lifecycle DeleteAfterDays=90
```

The destination ARN selects both the account and Region. The call returns a copy-job ID rather than an immediately usable copy. [StartCopyJob CLI](https://docs.aws.amazon.com/cli/latest/reference/backup/start-copy-job.html).

```bash
aws backup describe-copy-job \
  --profile production --region us-east-1 \
  --copy-job-id REPLACE_WITH_COPY_JOB_ID \
  --query 'CopyJob.{State:State,Message:StatusMessage,Destination:DestinationRecoveryPointArn,Completed:CompletionDate}'
```

Wait for `COMPLETED`; investigate any failure message before proceeding. Save the **destination** recovery-point ARN from that response. Then use the recovery-account profile to list the destination vault and confirm the point, resource type, encryption key, and expiration. This catches wrong-account assumptions and independent destination-policy failures.

## Restore where production permissions are unavailable

Use a recovery role that is intended to work during a source-account outage. It needs restore permissions and access to the relevant keys; the caller needs `iam:PassRole`. Retrieve the destination point's restore metadata and review it:

```bash
aws backup get-recovery-point-restore-metadata \
  --profile recovery --region us-west-2 \
  --backup-vault-name efs-dr \
  --recovery-point-arn REPLACE_WITH_DESTINATION_RECOVERY_POINT_ARN
```

For an isolated full restore into a new encrypted file system, an example metadata file is:

```json
{
  "newFileSystem": "true",
  "CreationToken": "efs-dr-drill-2026-09-28-unique-run",
  "Encrypted": "true",
  "PerformanceMode": "generalPurpose"
}
```

Use a unique creation token for a new drill, and add an approved destination `KmsKeyId` if using a customer-managed EFS key. Metadata values are strings in the API map. [EFS restore parameters](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html).

```bash
aws backup start-restore-job \
  --profile recovery --region us-west-2 \
  --recovery-point-arn REPLACE_WITH_DESTINATION_RECOVERY_POINT_ARN \
  --iam-role-arn arn:aws:iam::444455556666:role/efs-restore-role \
  --resource-type EFS \
  --metadata file://efs-restore-metadata.json
```

Monitor the restore job to completion and record `CreatedResourceArn`. Prepare mount targets, security groups, and any required access points for the recovery VPC. Restore completion does not deploy those application dependencies.

## Prove that the files are usable

Mount the restored file system on an isolated client. Locate its `aws-backup-restore_*` directory, then validate known file hashes, numeric ownership, permissions, and representative application behavior. Full restores also use that recovery directory; an empty original application path does not mean the copy lost data.

Run the application as its actual service UID/GID with outbound integrations disabled for the drill. Measure the elapsed time from incident declaration through usable application data, including restore time and mount preparation. Record the age of the recoverable data at the incident separately, using the newest recoverable business transaction rather than the backup or copy job's completion time.

After the test, remove disposable compute and restored storage according to the drill plan, while keeping retained recovery points under their vault policy. Repeat after key, IAM, account, or application changes. The evidence you want is a successful restore using recovery-account permissions alone, plus an application check that explains what can actually be recovered.
