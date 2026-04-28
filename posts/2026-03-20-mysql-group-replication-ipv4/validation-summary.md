# Validation Summary: How to Configure MySQL Group Replication on IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0+ Server
- MySQL Group Replication plugin
- GTID-based replication
- Paxos consensus protocol
- IPv4 networking

## Sources Consulted
- MySQL 8.0 Reference Manual — Group Replication (https://dev.mysql.com/doc/refman/8.0/en/group-replication.html)
- MySQL 8.0 Reference Manual — Group Replication System Variables (https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html)
- MySQL 8.0 Reference Manual — Configuring an Instance for Group Replication (https://dev.mysql.com/doc/refman/8.0/en/group-replication-configuring-instances.html)
- MySQL 8.0 Reference Manual — `binlog_checksum` system variable (https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_checksum)
- MySQL 8.0 Reference Manual — `CHANGE REPLICATION SOURCE TO` (https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html)
- MySQL 8.0 Reference Manual — `group_replication_ip_allowlist` (replaced `ip_whitelist` in 8.0.22)

## Issues Found
1. **Invalid configuration option name**: The post used `binary-log-checksum = NONE`, which is not a recognized MySQL option. The correct option is `binlog-checksum` (or `binlog_checksum`). Fixed in the configuration block.
2. **Architecture diagram contradicted the configuration**: The diagram described the topology as "All nodes can accept writes (multi-primary)" while the configuration below explicitly enables single-primary mode (`group-replication-single-primary-mode = ON`). Updated the diagram to describe single-primary mode so it matches the config example.

## Review Notes
- `log-replica-updates` is the modern (MySQL 8.0.26+) name for the option formerly called `log-slave-updates`. Both spellings work in current versions; the new name is correct here.
- `group-replication-ip-allowlist` is the correct modern option name (it replaced `group-replication-ip-whitelist` in MySQL 8.0.22).
- `CHANGE REPLICATION SOURCE TO ... FOR CHANNEL 'group_replication_recovery'` is the correct modern syntax (replaces the deprecated `CHANGE MASTER TO`).
- Starting in MySQL 8.0.21, Group Replication supports binary log checksums, so `binlog-checksum=NONE` is no longer strictly required. It is still a valid setting and improves backward compatibility with older nodes, so the post's choice is acceptable.
- The example UUID `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` is a syntactically valid UUID format (8-4-4-4-12). Production deployments should generate a fresh UUID with `SELECT UUID();`.
- The replication user is created on each joining node before joining, which works but may produce slightly different GTID sets across nodes. A more typical pattern is to create the user with `SET SQL_LOG_BIN=0` to keep the operation out of the binary log, but the approach shown is functional and not technically incorrect.
- The post correctly notes that 3 nodes is the minimum to tolerate a single failure (2n+1 quorum requirement).
