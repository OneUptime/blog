# Validation Summary: How to Set Up MySQL Group Replication in Single-Primary Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ Group Replication
- InnoDB storage engine
- GTID-based replication
- Performance Schema for monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL 8.0 Reference Manual: Deploying Group Replication in Single-Primary Mode — https://dev.mysql.com/doc/refman/8.0/en/group-replication-deploying-in-single-primary-mode.html
- MySQL 8.0 Reference Manual: Group Replication System Variables — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO Statement — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: Group Replication User Credentials — https://dev.mysql.com/doc/refman/8.0/en/group-replication-user-credentials.html

## Issues Found
1. **Missing replication user on bootstrap node (node1)**: The original post only created the replication user (`repl`) on the secondary nodes (node2, node3). When a secondary joins the group, it uses distributed recovery to connect to a donor (typically node1) using these credentials. If the `repl` user does not exist on node1, the recovery connection fails and the secondary cannot join. Fixed by adding the `CREATE USER`, `GRANT`, and `CHANGE REPLICATION SOURCE TO` statements to the bootstrap section for node1, matching the same pattern used for secondaries.

## Review Notes
- The `CHANGE REPLICATION SOURCE TO` syntax used in the post was introduced in MySQL 8.0.23. Earlier 8.0 versions use the deprecated `CHANGE MASTER TO` syntax. Since the post targets "MySQL 8.0+" broadly, readers on versions before 8.0.23 would need to adjust.
- `binlog_format = ROW` is deprecated as of MySQL 8.0.34 (ROW is the only supported format). The setting is harmless but unnecessary on newer 8.0 releases.
- `group_replication_single_primary_mode = ON` is the default in MySQL 8.0, so explicitly setting it is not strictly required, but is good for clarity.
- The MySQL documentation recommends setting `disabled_storage_engines="MyISAM,BLACKHOLE,FEDERATED,ARCHIVE,MEMORY"` for Group Replication since only InnoDB is fully supported. This is a best practice rather than a strict requirement.
