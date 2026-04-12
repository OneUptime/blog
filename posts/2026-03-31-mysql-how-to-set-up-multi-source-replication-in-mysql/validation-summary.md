# Validation Summary: How to Set Up Multi-Source Replication in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.23+
- MySQL Multi-Source Replication
- MySQL GTID-based Replication
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Multi-Source Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-multi-source.html)
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO (https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html)
- MySQL 8.0 Reference Manual: Replication Server System Variables — master_info_repository, relay_log_info_repository (https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html)
- MySQL 8.0 Reference Manual: START REPLICA (https://dev.mysql.com/doc/refman/8.0/en/start-replica.html)
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)

## Issues Found
1. **Version prerequisite mismatch**: The post stated "MySQL 5.7 or later" in prerequisites but used `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`, and `RESET REPLICA ALL` syntax throughout, which was introduced in MySQL 8.0.22–8.0.23. In MySQL 5.7, the equivalent commands are `CHANGE MASTER TO`, `START SLAVE`, `SHOW SLAVE STATUS`, and `RESET SLAVE ALL`. Fixed by updating the prerequisite to "MySQL 8.0.23 or later" to match the syntax used in the tutorial.

2. **Deprecated/unnecessary configuration variables**: The Step 1 config included `master_info_repository = TABLE` and `relay_log_info_repository = TABLE`. These variables are deprecated in MySQL 8.0.23 and removed in MySQL 8.4. In MySQL 8.0+, `TABLE` is already the default and only supported value, making these settings redundant. Removed the deprecated variables and added a note that TABLE is the default in MySQL 8.0+.

3. **Stale prerequisite bullet**: The prerequisite about needing TABLE repository type was removed since it is the default and only option in MySQL 8.0+.

## Review Notes
- The `FLUSH PRIVILEGES` in Step 2 is technically unnecessary after `CREATE USER` and `GRANT` statements (MySQL automatically reloads grant tables), but it is harmless and a common practice, so it was left as-is.
- `SHOW MASTER STATUS` in Step 3 still works in MySQL 8.0.x but was deprecated in MySQL 8.2.0 in favor of `SHOW BINARY LOG STATUS`. Since the post targets 8.0.23+, the current syntax is acceptable but may need updating for MySQL 8.4+/9.0+ deployments.
- The GTID conflict-handling section is accurate but could note in the future that GTID alone does not resolve write conflicts on the same table — it only detects duplicate transactions. Application-level partitioning of writes is still the recommended approach.
