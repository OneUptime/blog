# Validation Summary: How to Fix RDS Storage Full Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- Amazon CloudWatch metrics and alarms
- MySQL and MariaDB
- PostgreSQL
- RDS backups and snapshots

## Sources Consulted
- Amazon RDS: Scaling up DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.ModifyingExisting.ScalingUp.html
- Amazon RDS: Storage autoscaling: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- AWS CLI: rds modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- Amazon RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS CLI: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon RDS for MySQL binary log configuration: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-configuring.html
- Amazon RDS for MariaDB binary logs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MariaDB.Binarylog.html
- Amazon RDS backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- PostgreSQL system administration functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL pg_replication_slots view: https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- PostgreSQL VACUUM: https://www.postgresql.org/docs/current/sql-vacuum.html
- MySQL SHOW BINARY LOGS: https://dev.mysql.com/doc/refman/en/show-binary-logs.html
- MySQL OPTIMIZE TABLE: https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html

## Issues Found
- The CloudWatch `date` command used the macOS-only `-v-1H` option. Changed it to the GNU/Linux-compatible `date -u -d '1 hour ago'`, which better matches typical AWS CLI environments.
- The RDS storage modification cooldown was incomplete. Updated it to say further storage changes are blocked for six hours or until storage optimization completes, whichever is longer.
- The PostgreSQL table-size query built unquoted relation names and had an incorrect `tablename::regclass` expression for index size. Changed the query to use `format('%I.%I', schemaname, tablename)::regclass`.
- The PostgreSQL WAL query used `pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')`, which reports an LSN byte offset rather than WAL files currently on disk. Changed it to sum `pg_ls_waldir()` file sizes.
- The MySQL RDS binary log retention note said `NULL` means "as long as possible." Official RDS documentation says `NULL` means binary logs aren't retained for RDS for MySQL. Corrected the note.
- The `VACUUM FULL` / `OPTIMIZE TABLE` note overstated MySQL locking behavior. Updated it to distinguish PostgreSQL's exclusive lock from MySQL InnoDB online DDL behavior and remaining lock caveats.
- The snapshots section implied manual snapshots consume or free instance storage. Corrected it to say automated backups and manual snapshots use separate backup storage and cleanup reduces backup storage costs, not DB volume usage.

## Review Notes
The main AWS CLI commands and RDS storage autoscaling thresholds are consistent with current AWS documentation. The local environment did not have the AWS CLI installed, so CLI syntax was verified against official AWS CLI documentation rather than local `--help` output.
