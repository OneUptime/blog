# Validation Summary: How to Use the CLONE Plugin in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.17+
- MySQL Clone Plugin
- InnoDB storage engine
- MySQL replication (GTID-based)
- MySQL Group Replication
- performance_schema tables (clone_status, clone_progress)

## Sources Consulted
- MySQL 8.0 Reference Manual: The Clone Plugin (https://dev.mysql.com/doc/refman/8.0/en/clone-plugin.html)
- MySQL 8.0 Reference Manual: Cloning Data Locally (https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-local.html)
- MySQL 8.0 Reference Manual: Cloning Remote Data (https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-remote.html)
- MySQL 8.0 Reference Manual: Monitoring Cloning Operations (https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-monitoring.html)
- MySQL 8.0 Reference Manual: Clone System Variables (https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-options-variables.html)
- MySQL 8.0 Reference Manual: performance_schema clone_status Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-clone-status-table.html)
- MySQL 8.0 Reference Manual: performance_schema clone_progress Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-clone-progress-table.html)

## Issues Found
1. **Wrong table name in monitoring query**: The first monitoring query selected columns `STAGE, STATE, BEGIN_TIME, END_TIME, ESTIMATE, DATA, NETWORK` from `performance_schema.clone_status`, but the columns `STAGE`, `ESTIMATE`, `DATA`, and `NETWORK` belong to `performance_schema.clone_progress`, not `clone_status`. The `clone_status` table contains columns like `ID, PID, STATE, BEGIN_TIME, END_TIME, SOURCE, DESTINATION, ERROR_NO, ERROR_MESSAGE, BINLOG_FILE, BINLOG_POSITION, GTID_EXECUTED`. Fixed by changing the table name in the first query to `clone_progress` and updating the second query to reference `clone_status` for overall status, making both queries useful and non-redundant.

## Review Notes
- The post correctly notes the MySQL 8.0.17+ requirement for the Clone plugin.
- The `INSTALL PLUGIN` syntax uses `mysql_clone.so` which is correct for Linux/macOS. On Windows the shared library would be `mysql_clone.dll`, but this is a minor platform difference not worth noting in the post.
- The `CHANGE REPLICATION SOURCE TO` syntax used for replica setup is the modern syntax introduced in MySQL 8.0.23, replacing the older `CHANGE MASTER TO`. This is appropriate for a post targeting MySQL 8.
- The restriction about only InnoDB tables being cloned is correct. Schema definitions (DDL) for non-InnoDB tables are preserved, but their data is not cloned. The post's wording is accurate for practical purposes.
- All clone system variables mentioned are correct and current.
- The required privileges (BACKUP_ADMIN on donor, CLONE_ADMIN on recipient) are accurate.
