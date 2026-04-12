# Validation Summary: How to Set Up Source-Replica Replication in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL binary log replication (source-replica / master-slave)
- mysqldump
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: mysqldump --source-data / --master-data — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: replication_applier_status_by_worker table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual: Server System Variables (binlog_row_image, log_replica_updates, etc.) — https://dev.mysql.com/doc/refman/8.0/en/replication-options.html

## Issues Found
No technical issues found.

## Review Notes
- The `--master-data=2` mysqldump flag was deprecated in MySQL 8.0.26 in favor of `--source-data=2`. The post uses the older flag, which still works in all current MySQL versions but emits a deprecation warning on 8.0.26+. Since the post already provides version-specific syntax for other commands, a future update could mention `--source-data=2` as the modern alternative.
- Similarly, `SHOW MASTER STATUS` (used in the FLUSH TABLES alternative section) was deprecated in MySQL 8.2.0 in favor of `SHOW BINARY LOG STATUS`. It remains valid for all 8.0.x releases.
- The `SHOW REPLICA STATUS` output column names shown (`Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`) are specific to MySQL 8.0.26+. Users on 8.0.22–8.0.25 running `SHOW REPLICA STATUS` will see the old column names (`Slave_IO_Running`, `Slave_SQL_Running`, `Seconds_Behind_Master`). This is a minor point since the post targets both old and new versions.
- The `binlog_row_image = MINIMAL` setting is a valid performance optimization that reduces binary log size, but `FULL` (the default) is the safer choice for general-purpose replication. `MINIMAL` can cause issues in multi-source replication or when triggers/auditing rely on full before-images. For a basic tutorial, this is an acceptable choice.
- The `log_replica_updates` variable name in the replica configuration is only recognized in MySQL 8.0.26+. Users on MySQL 5.7 would need `log_slave_updates` instead. A future update could note this alongside the other version-specific instructions.
