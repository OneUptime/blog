# Validation Summary: How to Set Up Semi-Synchronous Replication in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0.26+ and 5.7)
- Semi-synchronous replication plugins (`semisync_source`, `semisync_replica`)
- MySQL replication configuration (`my.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Semisynchronous Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-semisync.html)
- MySQL 8.0 Reference Manual: Semisynchronous Replication Installation and Configuration (https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-installation.html)
- MySQL 8.0 Reference Manual: Semisynchronous Replication Monitoring (https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-monitoring.html)
- MySQL 5.7 Reference Manual: Semisynchronous Replication (https://dev.mysql.com/doc/refman/5.7/en/replication-semisync.html)

## Issues Found
1. **Incorrect phantom reads attribution in AFTER_COMMIT vs AFTER_SYNC table**: The table described `AFTER_COMMIT` as having "Possible phantom reads on replica." The phantom read issue with `AFTER_COMMIT` actually occurs on the **source**, not the replica. With `AFTER_COMMIT`, the source commits the transaction before waiting for replica acknowledgment, so other sessions on the source can see the committed data. If the source crashes before the replica acknowledges, that transaction is lost on failover — clients that saw it on the old source experience a phantom read. Changed to "Phantom reads possible on source; data loss risk on failover" to accurately describe the issue.

## Review Notes
- The post consistently uses MySQL 8.0.26+ naming conventions (`rpl_semi_sync_source_*`, `rpl_semi_sync_replica_*`, `STOP REPLICA`, `START REPLICA`) while also showing 5.7 equivalents for plugin installation. This is appropriate and forward-looking.
- The `rpl_semi_sync_source_wait_for_replica_count` variable was actually introduced in MySQL 5.7.3 (as `rpl_semi_sync_master_wait_for_slave_count`), not only in MySQL 8.0 as the section heading implies. However, since the post uses 8.0.26+ variable names throughout, the section is consistent and not misleading.
- The `my.cnf` configuration sections assume the plugins were previously installed via `INSTALL PLUGIN` (which persists in `mysql.plugin` table across restarts). This workflow is correct but could be made more explicit for readers who skip the plugin installation step.
- In MySQL 8.0, `AFTER_SYNC` is the default wait point. The post correctly labels `AFTER_COMMIT` as the "old default" (it was the implicit behavior before 5.7.2 introduced the wait point setting).
