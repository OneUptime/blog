# Validation Summary: How to Restore an RDS Instance from a Snapshot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS
- AWS CLI
- AWS KMS
- Amazon Route 53
- PostgreSQL
- Python
- Boto3

## Sources Consulted
- Amazon RDS User Guide: Restoring to a DB instance from a DB snapshot: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html
- AWS CLI Command Reference: restore-db-instance-from-db-snapshot: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- Amazon RDS API Reference: RestoreDBInstanceFromDBSnapshot: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_RestoreDBInstanceFromDBSnapshot.html
- Boto3 RDS client reference: restore_db_instance_from_db_snapshot: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/restore_db_instance_from_db_snapshot.html
- AWS CLI Command Reference: describe-db-snapshots: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html
- AWS CLI Command Reference: modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: copy-db-snapshot: https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- AWS CLI Command Reference: change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon RDS User Guide: Working with option groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html

## Issues Found
- The post said backup retention period is not preserved and uses defaults after snapshot restore. AWS documents `BackupRetentionPeriod` for `RestoreDBInstanceFromDBSnapshot` as defaulting to the existing setting, so I removed it from the list of settings that are not preserved.
- The post said the option group simply reverts to default. AWS documents that this is true in most cases, but persistent or permanent options can require a compatible option group, so I clarified that caveat.
- The post said the Multi-AZ setting is not preserved without noting the documented SQL Server mirroring exception. I added the exception.
- The production restore example used PostgreSQL-specific settings while also specifying an option group. Amazon RDS for PostgreSQL does not use option groups, so I removed `--option-group-name my-option-group` from that example.
- The CloudWatch Logs export example used JSON list syntax for a single AWS CLI list argument. I changed it to the documented CLI list form: `--enable-cloudwatch-logs-exports postgresql`.

## Review Notes
The examples are written for non-Aurora RDS DB instances. Aurora restores use DB cluster snapshot restore commands and different backup-retention behavior, so that would be worth calling out separately in a future article if Aurora is in scope.
