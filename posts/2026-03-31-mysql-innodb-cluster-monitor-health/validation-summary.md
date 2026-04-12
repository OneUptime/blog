# Validation Summary: How to Monitor MySQL InnoDB Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL InnoDB Cluster
- MySQL Shell (mysqlsh)
- MySQL Group Replication
- MySQL Performance Schema
- Bash scripting

## Sources Consulted
- MySQL Shell 8.0 Reference: AdminAPI `cluster.status()` — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster-status.html
- MySQL 8.0 Reference: `performance_schema.replication_group_members` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html
- MySQL 8.0 Reference: `performance_schema.replication_group_member_stats` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-member-stats-table.html
- MySQL 8.0 Reference: InnoDB Cluster metadata schema — https://dev.mysql.com/doc/mysql-shell/8.0/en/innodb-cluster-metadata.html
- MySQL Shell 8.0 Reference: `mysqlsh` CLI options — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysqlsh.html

## Issues Found
1. **Incorrect metadata view name `v2_members`**: The query `SELECT address, member_role, member_state FROM v2_members;` referenced a view that does not exist in the `mysql_innodb_cluster_metadata` schema. The standard metadata schema provides the `instances` table (and `v2_instances` view in schema v2.0+), but not `v2_members`. Additionally, `member_role` and `member_state` are dynamic Group Replication columns from `performance_schema.replication_group_members`, not metadata schema columns. **Fixed** to `SELECT instance_id, address, mysql_server_uuid FROM instances;` which correctly queries the cluster metadata for configured instance information.

## Review Notes
- The `cluster.status({extended: true})` call uses `true` which is equivalent to `{extended: 1}`. MySQL Shell also supports integer levels 0-3 for increasing detail. The usage shown is correct.
- The quorum status values listed (OK, OK_NO_TOLERANCE, NO_QUORUM, OFFLINE) are all valid but not exhaustive. Other possible statuses include OK_PARTIAL, OK_NO_TOLERANCE_PARTIAL, ERROR, FENCED_WRITES, and INVALIDATED. This is acceptable since the post shows common examples without claiming to be exhaustive.
- The monitoring script passes credentials on the command line (`--uri admin:secret@node1:3306`), which is a security concern in production (visible in process lists). A note about using MySQL Shell's credential helper or login-path would improve the script, but this is a style suggestion rather than a technical error.
