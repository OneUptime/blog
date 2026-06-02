# Validation Summary: How to Migrate from Self-Managed MySQL to RDS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon RDS for MySQL
- AWS Database Migration Service
- MySQL replication
- mysqldump
- AWS CLI
- CloudWatch / RDS monitoring

## Sources Consulted
- Amazon RDS User Guide: MySQL on Amazon RDS versions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Amazon RDS User Guide: Importing data to an Amazon RDS for MySQL database with reduced downtime - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-importing-data-reduced-downtime.html
- Amazon RDS User Guide: MySQL feature support on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.FeatureSupport.html
- Amazon RDS User Guide: Known issues and limitations for Amazon RDS for MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.KnownIssuesAndLimitations.html
- MySQL 8.0 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: Binary Logging Options and Variables - https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS - https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- AWS DMS User Guide: Migrating databases to their Amazon RDS equivalents with AWS DMS - https://docs.aws.amazon.com/dms/latest/userguide/data-migrations.html
- AWS DMS Database Migration Guide: Migrating a MySQL Database to RDS for MySQL or Aurora MySQL - https://docs.aws.amazon.com/dms/latest/sbs/chap-manageddatabases.mysql2rds.html

## Issues Found
- The RDS create command used MySQL engine version 8.0.36, which is no longer in the current supported RDS for MySQL minor-version list. Updated it to 8.0.46.
- The compressed dump example piped gzip-compressed bytes directly into `mysql`, which would not restore successfully. Changed it to write a `.gz` file and restore with `gunzip -c`.
- The source MySQL configuration used `binlog-retention-hours`, which is an RDS configuration name, not a self-managed MySQL server option. Replaced it with `binlog_expire_logs_seconds = 604800`.
- The replication dump used deprecated MySQL 8 terminology with `--master-data=2` and a `CHANGE MASTER TO` comment. Updated the example to `--source-data=2` and the current `CHANGE REPLICATION SOURCE TO` output form.
- The replication monitoring example used deprecated `SHOW SLAVE STATUS` output names. Updated it to `SHOW REPLICA STATUS` with `Replica_IO_Running`, `Replica_SQL_Running`, and `Seconds_Behind_Source`.
- The `--single-transaction` comment implied consistency for all table engines without locks. Clarified that this applies to InnoDB tables.
- The common-issues section said RDS MySQL does not support `LOAD DATA LOCAL`; AWS RDS documentation uses `LOAD DATA LOCAL INFILE` for imports. Replaced that example with direct host access.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against official AWS documentation rather than local `aws --help` output. RDS for MySQL 8.0 remains under RDS standard support until July 31, 2026; future updates to this post should consider a MySQL 8.4 example, which uses `mysql.rds_set_external_source` and `mysql.rds_reset_external_source`.
