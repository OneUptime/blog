# Validation Summary: How to Handle Network Partitions in MySQL Group Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Group Replication
- XCom (Paxos-based consensus protocol)
- MySQL performance_schema
- MySQL system variables (group_replication_member_expel_timeout, group_replication_autorejoin_tries, group_replication_consistency, group_replication_force_members)

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL 8.0 Reference Manual: group_replication_member_expel_timeout — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html#sysvar_group_replication_member_expel_timeout
- MySQL 8.0 Reference Manual: group_replication_autorejoin_tries — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html#sysvar_group_replication_autorejoin_tries
- MySQL 8.0 Reference Manual: group_replication_consistency — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html#sysvar_group_replication_consistency
- MySQL 8.0 Reference Manual: group_replication_force_members — https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html#sysvar_group_replication_force_members
- MySQL 8.0 Reference Manual: Network Partitioning — https://dev.mysql.com/doc/refman/8.0/en/group-replication-network-partitioning.html

## Issues Found
1. **Incorrect value format for `group_replication_force_members`**: The post used `'uuid-of-this-node'` as the example value, but this variable accepts `host:port` format addresses (the `group_replication_local_address` values), not server UUIDs. Changed to `'node1:33061'` to correctly demonstrate the expected format.

## Review Notes
- The default values mentioned for `group_replication_member_expel_timeout` (5 seconds) and `group_replication_autorejoin_tries` (3) are correct for MySQL 8.0.21+. In earlier versions (8.0.13–8.0.20) these defaults were 0. The post doesn't specify a MySQL version, but the modern defaults are reasonable.
- The `group_replication_member_expel_timeout` controls the additional wait time after an initial 5-second suspicion period built into the Group Communication System. The total time before expulsion is therefore the suspicion period plus this timeout. The post simplifies this, which is acceptable for a blog post but readers should be aware of the two-phase nature of member expulsion.
- All SQL syntax, system variable names, performance_schema table/column names, and consistency level values are correct.
- The quorum calculations are accurate.
