# Validation Summary: How to Troubleshoot RDS Storage Full Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- Amazon CloudWatch
- PostgreSQL
- MySQL

## Sources Consulted
- AWS RDS troubleshooting: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Troubleshooting.html
- AWS RDS DB instance status values: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/accessing-monitoring.html
- AWS RDS storage autoscaling: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- AWS RDS DB instance modification settings: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html
- AWS CLI `modify-db-instance`: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI `put-metric-alarm`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS RDS for MySQL binary log configuration: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-configuring.html
- AWS RDS for PostgreSQL replication monitoring: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.Monitor.html
- AWS RDS for PostgreSQL logical replication slot guidance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Autovacuum_Monitoring.Resolving_Identifiableblockers.html
- PostgreSQL `VACUUM` documentation: https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL `REINDEX` documentation: https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL statistics views documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL `pg_constraint` catalog documentation: https://www.postgresql.org/docs/current/catalog-pg-constraint.html
- MySQL `INFORMATION_SCHEMA.TABLES` documentation: https://dev.mysql.com/doc/mysql/8.0/en/information-schema-tables-table.html

## Issues Found
- The PostgreSQL largest-table query built relation names with `schemaname || '.' || tablename`, which can fail for quoted, mixed-case, or otherwise special identifiers. Updated it to use `format('%I.%I', schemaname, tablename)::regclass`.
- The PostgreSQL WAL query used `pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')`, which reports distance from the beginning of the WAL address space rather than actual WAL disk usage. Replaced it with guidance to use the RDS `TransactionLogsDiskUsage` CloudWatch metric and kept the replication-slot retained-WAL query.
- The autovacuum tuning comment said the AWS CLI parameter-group command made settings more aggressive for specific tables. Parameter groups apply at the instance/parameter-group level, so the comment now says "for this parameter group."
- The unused-index query referenced `pg_constraint.indexrelid`, which is not a PostgreSQL catalog column. Updated it to use `pg_constraint.conindid`, the documented catalog field for the index supporting a constraint.
- The audit/log table size query used `tablename::regclass`, which can fail when the table is outside the current search path or when names collide. Updated it to use `pg_stat_user_tables.relid` and include `schemaname`.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against official AWS CLI documentation rather than local `--help` output.
- The CloudWatch alarm thresholds are byte values and are correct for a 200 GiB example database, but readers should adjust them to their own allocated storage.
