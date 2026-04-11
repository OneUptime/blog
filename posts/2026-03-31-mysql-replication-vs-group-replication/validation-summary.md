# Validation Summary: MySQL Replication vs Group Replication: Key Differences

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- MySQL (8.0+)
- MySQL Classic Source-Replica Replication
- MySQL Group Replication (introduced in MySQL 5.7.17)
- MySQL InnoDB Cluster
- Orchestrator (failover tool)
- MySQL Router / ProxySQL

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: Group Replication Status Variables — https://dev.mysql.com/doc/refman/8.0/en/group-replication-status-variables.html
- MySQL 8.0 Reference Manual: performance_schema.replication_group_members — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html

## Issues Found
1. **Incorrect LIKE pattern for Group Replication status variables**: The monitoring query used `WHERE VARIABLE_NAME LIKE 'Gr_%'` which does not match any MySQL status variables. Group Replication status variables use the prefix `group_replication_`. Changed to `WHERE VARIABLE_NAME LIKE 'group_replication_%'`.

## Review Notes
- The post correctly uses the MySQL 8.0.22+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`) rather than the deprecated `CHANGE MASTER TO` / `START SLAVE` syntax.
- Group Replication is accurately described as using a Paxos-based consensus protocol. MySQL's official documentation refers to the underlying Group Communication System (GCS) which is based on Paxos/Mencius.
- The term "virtually synchronous" used in the consistency table matches MySQL's official terminology for Group Replication.
- For more granular commit latency monitoring, the `performance_schema.replication_group_member_stats` table provides per-member transaction statistics (e.g., `COUNT_TRANSACTIONS_IN_QUEUE`, `COUNT_TRANSACTIONS_CHECKED`, `COUNT_CONFLICTS_DETECTED`) and may be more useful than querying `global_status`, but the approach shown is valid.
- The default Group Replication communication port (33061) is correctly stated.
