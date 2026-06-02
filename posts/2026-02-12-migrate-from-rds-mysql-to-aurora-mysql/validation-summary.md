# Validation Summary: How to Migrate from RDS MySQL to Aurora MySQL

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon RDS for MySQL
- Amazon Aurora MySQL
- AWS CLI
- AWS Database Migration Service
- MySQL replication and binary logging
- Python with boto3 and PyMySQL

## Sources Consulted
- Amazon Aurora User Guide: Migrating an RDS for MySQL snapshot to Aurora, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Migrating.RDSMySQL.Snapshot.html
- Amazon Aurora User Guide: Migrating RDS for MySQL to Aurora MySQL using an Aurora read replica, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Migrating.RDSMySQL.Replica.html
- AWS CLI Command Reference: restore-db-cluster-from-snapshot, https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-cluster-from-snapshot.html
- AWS CLI Command Reference: create-db-cluster, https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI Command Reference: create-endpoint for AWS DMS, https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS DMS User Guide: Using a MySQL-compatible database as a source, https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- Amazon Aurora User Guide: Preparing for Aurora MySQL version 2 end of standard support, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.MySQL57.EOL.html
- Amazon Aurora MySQL Release Notes: Release calendars for Aurora MySQL, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html

## Issues Found
- The snapshot migration section implied downtime is required while the snapshot is created and restored. Updated it to clarify that writes should be stopped before the snapshot and kept read-only or offline until cutover to avoid losing post-snapshot writes.
- The snapshot restore example created a writer instance after restoring an RDS for MySQL snapshot. AWS documentation for migrating an RDS for MySQL DB snapshot says RestoreDBClusterFromSnapshot creates the DB cluster and primary instance, so the extra writer creation step was removed and replaced with a cluster-available waiter.
- The examples pinned Aurora MySQL `5.7.mysql_aurora.2.11.2`, but Aurora MySQL version 2 is past standard support and in RDS Extended Support. Removed the hard-coded 5.7 engine version from the migration commands and changed the checklist parameter group example to `default.aurora-mysql8.0`.
- The DMS MySQL source and target endpoint examples used `--database-name`. AWS DMS documentation says not to explicitly specify `DatabaseName` for MySQL endpoints and to use table mappings for schemas instead. Removed `--database-name` from both endpoint commands.

## Review Notes
The read replica approach is correctly described as asynchronous and suitable for low-downtime cutovers after replication lag reaches zero. DMS examples remain intentionally skeletal; a production migration should also configure IAM roles, subnet groups, security groups, validation, binary log retention, and task settings appropriate to the environment.
