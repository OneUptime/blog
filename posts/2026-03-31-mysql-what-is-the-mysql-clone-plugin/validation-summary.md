# Validation Summary: What Is the MySQL Clone Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 (8.0.17+)
- MySQL Clone Plugin
- InnoDB storage engine
- MySQL replication (binary log and GTID-based)
- MySQL Group Replication
- performance_schema monitoring tables

## Sources Consulted
- MySQL 8.0 Reference Manual: The Clone Plugin — https://dev.mysql.com/doc/refman/8.0/en/clone-plugin.html
- MySQL 8.0 Reference Manual: clone_status table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-clone-status-table.html
- MySQL 8.0 Reference Manual: clone_progress table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-clone-progress-table.html
- MySQL 8.0 Reference Manual: Cloning for Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication-cloning.html
- MySQL 8.0 Reference Manual: Clone Plugin privileges — https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-remote.html

## Issues Found

1. **Incorrect claim about "system configuration" in overview**: The post stated the Clone Plugin copies "system configuration." The Clone Plugin copies InnoDB data files, tablespaces, redo logs, and undo logs, but does NOT copy MySQL server configuration files (e.g., my.cnf). Changed "system configuration" to "undo logs."

2. **Wrong columns in clone_status monitoring query**: The query selected `STAGE`, `ESTIMATE`, `DATA_ELAPSED`, and `DATA_SPEED` from `performance_schema.clone_status`. These columns do not exist in the `clone_status` table — `STAGE` and `DATA_SPEED` belong to `performance_schema.clone_progress`, and `DATA_ELAPSED` is not a valid column in either table. Fixed the query to use the correct `clone_status` columns: `STATE`, `BEGIN_TIME`, `END_TIME`, `SOURCE`, `DESTINATION`, `ERROR_NO`, `ERROR_MESSAGE`, `BINLOG_FILE`, and `BINLOG_POSITION`.

## Review Notes
- The `group_replication_clone_threshold = 1` example is technically valid but very aggressive — it triggers a clone even if the joiner is only 1 transaction behind. In practice, a higher threshold is typical. The example works for illustrative purposes.
- The donor privilege setup grants both `BACKUP_ADMIN` and `CLONE_ADMIN` on the donor. Strictly, only `BACKUP_ADMIN` is required on the donor; `CLONE_ADMIN` is needed on the recipient for the user executing the CLONE INSTANCE statement. Granting both on the donor is not harmful but could be clarified in a future revision.
- The version compatibility limitation ("same MySQL version") is correct for early Clone Plugin releases. Later MySQL 8.0 versions relaxed this to allow cloning between certain minor version differences, but the general guidance remains valid.
