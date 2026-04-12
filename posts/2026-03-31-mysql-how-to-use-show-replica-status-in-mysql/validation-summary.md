# Validation Summary: How to Use SHOW REPLICA STATUS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0.22+ replication
- SHOW REPLICA STATUS command
- MySQL performance_schema replication tables
- GTID-based replication
- Binary log position-based replication

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- MySQL 8.0 Reference Manual: performance_schema replication tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html)
- MySQL 8.0 Reference Manual: replication_connection_status table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-connection-status-table.html)
- MySQL 8.0 Reference Manual: replication_applier_status table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-table.html)
- MySQL 8.0 Reference Manual: GTID operations (https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-howto.html)
- MySQL 8.0 Reference Manual: SHOW BINARY LOG STATUS (https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html)

## Issues Found

1. **Incorrect performance_schema column names in Health Check query**: The original query used `Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`, `Last_IO_Error`, and `Last_SQL_Error` as column names in `performance_schema.replication_connection_status`. These are output field names from `SHOW REPLICA STATUS`, not actual performance_schema column names. The real columns are `SERVICE_STATE`, `LAST_ERROR_MESSAGE`, etc., spread across `replication_connection_status` and `replication_applier_status` tables. Replaced with a correct JOIN query using the actual column names.

2. **Incorrect performance_schema query for binary log position lag**: The original query selected `Read_Source_Log_Pos` and `Exec_Source_Log_Pos` from `performance_schema.replication_applier_status_by_worker`, but these columns do not exist in that table. These values are only available from `SHOW REPLICA STATUS` output. Replaced with a `SHOW REPLICA STATUS` example showing how to interpret the position fields.

3. **Misleading Retrieved_Gtid_Set description**: The original said "events received but not yet applied." `Retrieved_Gtid_Set` is actually the complete set of all GTIDs received from the primary, including those already applied. Corrected to "all GTIDs received from the primary."

4. **Missing STOP REPLICA before GTID skip**: The GTID transaction skip procedure was missing an explicit `STOP REPLICA;` before `SET GTID_NEXT`. While the SQL thread may have already stopped due to the error, the I/O thread could still be running, and MySQL documentation requires replication to be stopped before using `SET GTID_NEXT`. Added the missing command.

5. **SHOW MASTER STATUS without newer alternative**: The post uses `SHOW REPLICA STATUS` (8.0.22+ syntax) throughout but then uses `SHOW MASTER STATUS` without noting that it was replaced by `SHOW BINARY LOG STATUS` in MySQL 8.2.0. Added a comment noting the newer syntax for forward compatibility.

## Review Notes
- The `\G` formatting note is helpful and accurate — SHOW REPLICA STATUS outputs 60+ columns, making vertical format essential.
- The `Seconds_Behind_Source` precision caveat and `pt-heartbeat` recommendation are accurate and valuable.
- The post correctly notes that `SHOW SLAVE STATUS` still works as an alias.
- `Seconds_Behind_Source` can also be misleading in multi-source replication setups; the post doesn't cover multi-source replication but that's acceptable for scope.
- The `heartbeat_period` mechanism referenced in the lag section is configured via `CHANGE REPLICATION SOURCE TO ... SOURCE_HEARTBEAT_PERIOD = N`, which is a valid approach.
