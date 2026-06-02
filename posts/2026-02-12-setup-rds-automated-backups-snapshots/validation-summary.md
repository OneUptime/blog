# Validation Summary: How to Set Up RDS Automated Backups and Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- RDS automated backups
- RDS manual DB snapshots
- Cross-Region backup replication
- AWS KMS encryption
- Python
- boto3

## Sources Consulted
- Amazon RDS User Guide: Introduction to backups - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- Amazon RDS User Guide: Backup retention period - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- Amazon RDS User Guide: Managing automated backups / backup window - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ManagingAutomatedBackups.html
- Amazon RDS User Guide: Copying a DB snapshot - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Amazon RDS User Guide: Encrypting Amazon RDS resources - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon RDS User Guide: Sharing a DB snapshot - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html
- Amazon RDS User Guide: Sharing encrypted snapshots - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- AWS CLI Command Reference: create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: copy-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- AWS RDS Pricing - https://aws.amazon.com/rds/pricing/
- Python datetime documentation - https://docs.python.org/3/library/datetime.html

## Issues Found
- Corrected the opening explanation so point-in-time recovery is attributed to automated backups, while manual snapshots are described as fixed restore points.
- Corrected automated backup deletion behavior. RDS automated backups can be retained when deleting a DB instance; they are not only preserved by taking a final snapshot.
- Narrowed the Multi-AZ backup performance claim. For MariaDB, MySQL, Oracle, and PostgreSQL, backups are taken from the standby and primary I/O is not suspended; SQL Server still briefly suspends I/O because backups are taken from the primary.
- Corrected the manual snapshot storage description from "full copies" to restorable snapshots stored incrementally.
- Added `--source-region us-east-1` to the cross-Region `copy-db-snapshot` command so the AWS CLI can generate the required source-region signing details for cross-Region encrypted copy scenarios.
- Updated the Python cleanup example to use timezone-aware UTC datetimes instead of stripping timezone information from AWS timestamps.
- Clarified encryption behavior: unencrypted DB instances cannot directly create encrypted snapshots, but an unencrypted snapshot can be copied with a KMS key to create an encrypted copy.
- Clarified encrypted snapshot sharing: snapshots encrypted with the default AWS managed KMS key cannot be shared directly; use a customer managed KMS key.
- Corrected backup storage cost wording to reflect that included backup storage is up to 100% of total provisioned DB storage in a Region for active DB instances.

## Review Notes
The AWS CLI commands use valid RDS operations and current flags. The linked OneUptime URLs returned HTTP 200 during review. Pricing examples remain region- and usage-dependent, so they should be treated as estimates rather than guarantees.
