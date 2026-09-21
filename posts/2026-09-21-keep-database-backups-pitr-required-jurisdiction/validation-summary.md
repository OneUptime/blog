# Validation Summary: How to Keep Database Backups and PITR Data Within Required Jurisdictions

## Status

validated

## Post Type

Technical guide with AWS CLI inventory commands and operational backup and restore guidance.

## Technologies Covered

- Amazon RDS DB instances, automated backups, manual snapshots, and cross-Region automated backup replication.
- AWS Backup plans, copy actions, recovery points, and continuous backups.
- Point-in-time recovery (PITR) and disaster recovery testing.
- AWS Key Management Service (KMS), IAM permissions, and network isolation.
- AWS Organizations backup policies.
- AWS CLI v2, Bash, JSON output, and JMESPath queries.

## Sources Consulted

- [RDS automated backup replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html): replication of snapshots and transaction logs, and deployment and Region restrictions.
- [describe-db-instances](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html): command options and instance response fields.
- [describe-db-instance-automated-backups](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instance-automated-backups.html): retained backups, restore windows, replication ARNs, and pagination.
- [describe-db-snapshots](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html): manual snapshot selection and snapshot inventory fields.
- [get-backup-plan](https://docs.aws.amazon.com/cli/latest/reference/backup/get-backup-plan.html): rule names, vaults, copy actions, destination ARNs, and continuous backup settings.
- [Cross-Region backup copies](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html): scheduled and on-demand copies and resource-specific limitations.
- [Continuous backups and PITR](https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html): continuous recovery points, supported database deployments, and restore permissions.
- [Copying continuous backups](https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery-copying.html): snapshot copies created by continuous backup rules.
- [Retaining automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.Retaining.html): backups retained after instance deletion and their expiration.
- [Stopping automated backup replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/AutomatedBackups.StopReplicating.html): existing replicated backups remain subject to retention.
- [Restoring an RDS instance to a specified time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html): new restore instances, recoverable times, and security and parameter group configuration.
- [RDS encryption](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html): encrypted backups and snapshots, regional KMS dependencies, and consequences of unavailable keys.
- [AWS Organizations backup policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html): centrally applied backup plans and inherited policies.
- [list-copy-jobs](https://docs.aws.amazon.com/cli/latest/reference/backup/list-copy-jobs.html): copy-job status and source and destination metadata.
- [list-recovery-points-by-backup-vault](https://docs.aws.amazon.com/cli/latest/reference/backup/list-recovery-points-by-backup-vault.html): actual recovery-point inventory.

## Issues Found

No technical issues found.

The reviewed README.md required no edits.

## Review Notes

- All four commands use documented AWS CLI v2 operations and options. Both JMESPath projections use valid response paths and multiselect objects. The plan ID is explicitly a placeholder; execution requires configured credentials, appropriate read permissions, and an actual plan ID.
- The three RDS inventory operations support pagination. Keeping automatic pagination enabled is correct. The manual snapshot filter intentionally excludes other snapshot categories; the accompanying automated-backup and AWS Backup inventories are necessary to cover the guide's scope.
- The first query labels the instance name as `Id`; this is not the immutable `DbiResourceId`. The full automated-backup response includes the latter for backed-up instances. As a future enhancement, projecting `DbiResourceId` in the first query would also expose it for live instances without automated backups.
- Replication destination ARNs and backup vault ARNs identify geographic and account destinations. Current configuration alone cannot establish that historical copies have disappeared. AWS explicitly retains existing replicated backups after replication stops, subject to retention.
- AWS Backup copies made by continuous backup rules are snapshots. Native RDS automated backup replication also transfers transaction logs. The post correctly requires checking the actual artifact's recovery capabilities instead of assuming that all copies support PITR.
- Restore testing into an isolated network is appropriate. Cross-account recovery depends on the supported copy or sharing workflow and key permissions; the guide does not claim every native PITR backup can be restored directly into another account.
- RDS restores create a new instance and can use different security, parameter, and option groups. Checking access controls and application behavior after restoration is therefore appropriate. The marker should be committed and included in the available restore window.
- All five AWS documentation links in the post resolved to the intended resources. No deprecated command or field was identified. Regional and engine support remain deployment-specific, consistent with the post's stated scope.
- Both Bash blocks passed `bash -n`. All four commands, including their queries, passed offline `--generate-cli-skeleton output --no-sign-request` validation with installed AWS CLI 2.27.31. Current online AWS CLI v2 references were checked separately.
- Review covered documentation and command syntax, not a live AWS inventory or restore exercise. The jurisdiction boundary is an organizational input; this review does not establish compliance for a particular deployment.
