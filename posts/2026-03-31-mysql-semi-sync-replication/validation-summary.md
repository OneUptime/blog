# Validation Summary: How to Set Up MySQL Semi-Synchronous Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (specifically 8.0.26+)
- MySQL Semi-Synchronous Replication
- MySQL replication plugins (`semisync_source.so`, `semisync_replica.so`)
- MySQL configuration (`my.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Semisynchronous Replication: https://dev.mysql.com/doc/refman/8.0/en/replication-semisync.html
- MySQL 8.0 Reference Manual — Semisynchronous Replication Installation and Configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-installation.html
- MySQL 8.0 Reference Manual — Semisynchronous Replication System Variables: https://dev.mysql.com/doc/refman/8.0/en/replication-options-source.html
- MySQL 8.0.26 Release Notes (introduction of new source/replica terminology)
- MySQL 8.0 Reference Manual — Group Replication Background: https://dev.mysql.com/doc/refman/8.0/en/group-replication-background.html
- MySQL 5.7 Release Notes — 5.7.2 Semisynchronous Replication Notes (AFTER_SYNC introduction)
- MySQL 8.4 Reference Manual — Semisynchronous Replication: https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html

## Issues Found

1. **Incorrect MySQL version for new plugin naming (Prerequisites section)**: The post stated "MySQL 8.0+" uses the `rpl_semi_sync_source` / `rpl_semi_sync_replica` plugin names. This is incorrect — these names were introduced in MySQL 8.0.26. MySQL 8.0.0 through 8.0.25 still used the old `rpl_semi_sync_master` / `rpl_semi_sync_slave` names. Fixed "MySQL 8.0+" to "MySQL 8.0.26+" and clarified that versions 8.0.0–8.0.25 also use the old naming alongside 5.7.

2. **Inaccurate Group Replication description (Introduction table)**: The comparison table stated Group Replication requires "All members to apply." This is incorrect — Group Replication uses a Paxos-based consensus protocol that requires majority agreement, not unanimity. NDB Cluster does synchronize across all data nodes. Fixed to "Majority consensus (GR) or all data nodes (NDB)" to accurately describe both technologies.

## Review Notes
- All SQL syntax (`INSTALL PLUGIN`, `SET GLOBAL`, `SHOW STATUS`, `STOP/START REPLICA IO_THREAD`) is correct.
- Plugin library names (`semisync_source.so`, `semisync_replica.so`) are correct for MySQL 8.0.26+.
- The `my.cnf` configuration format and variable names are correct.
- All status variable names in the verification section are accurate.
- The key variables reference table defaults are all correct: `rpl_semi_sync_source_enabled` (OFF), `rpl_semi_sync_source_timeout` (10000 ms), `rpl_semi_sync_source_wait_no_replica` (ON), `rpl_semi_sync_source_wait_point` (AFTER_SYNC).
- The AFTER_SYNC vs AFTER_COMMIT explanation is accurate. AFTER_SYNC was indeed introduced in MySQL 5.7.2.
- Semi-sync replication remains plugin-based in MySQL 8.4 (not built-in), so the plugin installation instructions are still applicable. However, MySQL 8.4 removed the old `master`/`slave` terminology variants entirely — only the new `source`/`replica` names work.
- The Mermaid diagrams accurately represent the semi-sync flow and fallback behavior.
