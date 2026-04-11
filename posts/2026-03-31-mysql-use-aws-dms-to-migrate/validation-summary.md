# Validation Summary: How to Use AWS DMS to Migrate to MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Database Migration Service (DMS)
- AWS RDS (MySQL)
- MySQL binary logging and replication
- AWS CLI (rds, dms subcommands)

## Sources Consulted
- AWS DMS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/dms/
- AWS DMS User Guide — Using MySQL as a source: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- AWS RDS CLI Reference — create-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS DMS Table Mapping documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html
- MySQL Server System Variables (binlog configuration): https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html

## Issues Found
No technical issues found.

## Review Notes
- The `expire_logs_days` variable in the MySQL configuration (Step 4) is deprecated in MySQL 8.0.11+ in favor of `binlog_expire_logs_seconds`. Since this setting applies to the source database (which may be running MySQL 5.7 or earlier), it is acceptable. Authors migrating from MySQL 8.0+ sources may want to use `binlog_expire_logs_seconds = 259200` instead.
- The example ARN account ID (`123456789`) is 9 digits rather than the standard 12-digit AWS account ID format. This is clearly a placeholder and acceptable in a tutorial context.
- The `--engine-version 8.0` for RDS will resolve to the latest default minor version at creation time, which is standard tutorial practice.
