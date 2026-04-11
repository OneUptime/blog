# Validation Summary: How to Promote a Replica to Source in MySQL

## Status
validated

## Post Type
Tutorial / Procedural Guide

## Technologies Covered
- MySQL 8.0.22+ replication (GTID and position-based)
- MySQL planned switchover and emergency failover procedures
- AWS Route 53 DNS management
- ProxySQL (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — CHANGE REPLICATION SOURCE TO: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual — STOP REPLICA: https://dev.mysql.com/doc/refman/8.0/en/stop-replica.html
- MySQL 8.0 Reference Manual — RESET REPLICA: https://dev.mysql.com/doc/refman/8.0/en/reset-replica.html
- MySQL 8.0 Reference Manual — SHOW MASTER STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.0 Reference Manual — GTID replication: https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html
- MySQL 8.0 Reference Manual — read_only and super_read_only system variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- AWS CLI Reference — route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
No technical issues found.

## Review Notes
- The post uses `SHOW MASTER STATUS` in the verification section while the rest of the post consistently uses the modern MySQL 8.0.22+ naming convention (`SHOW REPLICA STATUS`, `CHANGE REPLICATION SOURCE TO`, etc.). This is not an error — `SHOW MASTER STATUS` is the only option on MySQL 8.0.x. The modern replacement `SHOW BINARY LOG STATUS` was introduced in MySQL 8.2.0. If the post is updated to target MySQL 8.2.0+, `SHOW MASTER STATUS` should be replaced with `SHOW BINARY LOG STATUS`.
- The `Exec_Master_Log_Pos` column name referenced in the emergency failover section retains the older "Master" naming even in `SHOW REPLICA STATUS` output on MySQL 8.0.x. This is correct behavior — MySQL did not rename this output column until later versions.
- The `FLUSH TABLES WITH READ LOCK` approach requires the session to remain open (the lock is released when the session closes). The `read_only`/`super_read_only` approach persists across sessions. Both are correctly presented as alternatives. Users should be aware of this session-scoping distinction when choosing between them.
