# Validation Summary: What Is MySQL Group Replication

## Status
validated

## Post Type
Guide / Technical Overview

## Technologies Covered
- MySQL Group Replication (MGR)
- MySQL Group Communication System (GCS) / XCom (Paxos variant)
- MySQL InnoDB Cluster
- MySQL Shell
- GTID-based replication

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL 8.0 Reference Manual: Group Replication Technical Details (Certification) — https://dev.mysql.com/doc/refman/8.0/en/group-replication-technical-details.html
- MySQL 8.0 Reference Manual: Group Replication System Variables — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html
- MySQL 8.0 Reference Manual: performance_schema.replication_group_members — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html
- MySQL 8.0 Reference Manual: InnoDB Cluster — https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html

## Issues Found
1. **Incorrect description of the consensus/certification process (Steps 2-3 in "How Consensus Works")**: The original text stated "All online members certify the transaction" and "If a majority certifies it, the transaction is committed globally." This conflated two distinct layers: the Paxos-based consensus at the GCS layer (which handles message ordering/delivery and requires a majority) and the certification process (which is deterministic, performed independently on each member, and always yields the same result on all members). Fixed by clarifying that the GCS uses Paxos for total-order delivery (majority required there), and that certification is a separate deterministic step where all members independently reach the same commit/abort decision.

## Review Notes
- The `my.cnf` configuration is minimal but valid for MySQL 8.0+, where `log_bin=ON`, `binlog_format=ROW`, and `log_slave_updates=ON` are all enabled by default. For MySQL 5.7, additional configuration would be needed.
- The post omits the distributed recovery user setup (`CHANGE REPLICATION SOURCE TO` or the `USER` clause on `START GROUP_REPLICATION`), which is required in practice for joining members to recover state. This is a simplification but not an error in the shown commands.
- The `MEMBER_STATE` values listed (`ONLINE`, `RECOVERING`, `UNREACHABLE`, `ERROR`) are correct but not exhaustive — `OFFLINE` is also a valid state. The post uses "include" so this is not an error.
- The plugin filename `group_replication.so` is correct for Linux; on Windows it would be `group_replication.dll`. This is a reasonable platform assumption for a blog post.
