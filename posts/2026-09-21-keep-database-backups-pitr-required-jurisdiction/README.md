# How to Keep Database Backups and PITR Data Within Required Jurisdictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, AWS RDS, AWS Backup, Database Backup, Disaster Recovery

Description: Inventory database snapshots, transaction logs, backup copies, encryption keys, and restore destinations to keep recovery inside an approved geographic boundary.

---

A database can run in an approved region while its recovery data travels elsewhere. Automated backup replication, a backup-plan copy rule, and a developer's database dump are three separate paths. A residency review must follow the complete restore chain.

This guide uses Amazon RDS DB instances and AWS Backup as a concrete example. Replace the example region with an approved location from your organization's requirements. Cluster-based products and other providers have different backup APIs.

## Define the recovery boundary

Write down which locations may contain database pages, transaction logs, snapshots, exports, temporary restore volumes, and encryption material. Distinguish a country requirement from a regional or broader geographic requirement; a region name alone does not establish the applicable rule.

For each database, record its account, region, immutable resource ID, backup owner, retention period, permitted recovery destinations, and recovery objectives. Include retired instances: retained automated backups and manual snapshots can outlive their source.

AWS documents that [RDS automated backup replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html) copies recovery material to a selected destination region. Therefore, checking only the live instance's region misses an explicit copy path.

## Inspect both native and centralized backups

Run the following read-only commands with an audit role and AWS CLI v2. Keep the output in an approved evidence location.

```bash
aws rds describe-db-instances \
  --region eu-west-2 \
  --query 'DBInstances[].{Id:DBInstanceIdentifier,Arn:DBInstanceArn,Retention:BackupRetentionPeriod,Key:KmsKeyId}' \
  --output json

aws rds describe-db-instance-automated-backups \
  --region eu-west-2 \
  --output json

aws rds describe-db-snapshots \
  --region eu-west-2 \
  --snapshot-type manual \
  --output json
```

In the automated-backup response, inspect `DBInstanceAutomatedBackupsArn`, `RestoreWindow`, and `DBInstanceAutomatedBackupsReplications`. The last field identifies replicated backup destinations. AWS defines these fields in the [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instance-automated-backups.html).

Repeat inventory in every relevant account and region, including previously used destinations. A current configuration without a copy rule does not demonstrate that historical copies were removed. Preserve pagination; do not add `--no-paginate`.

For every applicable AWS Backup plan, inspect its rules:

```bash
aws backup get-backup-plan \
  --region eu-west-2 \
  --backup-plan-id REPLACE_WITH_PLAN_ID \
  --query 'BackupPlan.Rules[].{Rule:RuleName,Vault:TargetBackupVaultName,Copies:CopyActions,PITR:EnableContinuousBackup}' \
  --output json
```

[Backup-plan output](https://docs.aws.amazon.com/cli/latest/reference/backup/get-backup-plan.html) includes each copy's `DestinationBackupVaultArn`. Resolve both region and account from that ARN, then inspect actual recovery points and copy-job history. Include organization policies and scheduled automation that could recreate a removed rule.

## Preserve recoverability while closing copy paths

If a destination is disallowed, stop new transfers through the service's supported control after confirming an approved recovery path exists. Track historical copies as a separate remediation item with owners and retention constraints. Disabling replication is not evidence of deleting its previous output.

Do not assume a copied recovery point retains the source's recovery semantics. AWS explains service-specific behavior and limitations for [cross-region backup copies](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html). Verify whether the actual copied artifact supports the required point-in-time restore or only snapshot restoration.

Also inventory SQL dumps in CI artifacts, support bundles, logical exports, archive buckets, and local administrative machines. Those copies will not necessarily appear in either RDS or AWS Backup inventory.

## Test a restore inside the boundary

Choose a synthetic marker written at a known time and a restore point after that write. Restore into an isolated account or network in the approved location. Keep application integrations disabled so the recovered database cannot send email, replay payments, or export telemetry.

Verify the restored record, schema, access controls, KMS permissions, and application read path. Record the selected restore time, actual recoverable window, elapsed recovery time, and destination resource ARN. Delete the test resource using its normal retention procedure after recording the result.

The restore also exercises key availability. [RDS encryption documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html) describes dependencies between instances, snapshots, and KMS keys. Retaining a backup while losing its required key does not meet a recovery objective.

Finally, repeat the inventory after policy changes and on a schedule. Alert separately for an unapproved destination, a missing backup, a stale restore test, and an unusable key. Residency and recoverability are independent conditions; both must pass.
