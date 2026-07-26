# Validation Summary: Should You Run XtraBackup on the Primary or a Dedicated Percona Replica?

## Status
validated

## Post Type
Operational guide and capacity-planning decision guide

## Technologies Covered
- Percona XtraBackup 8.4
- Percona Server for MySQL 8.4
- MySQL 8.4 replication
- GTID-based replication
- Percona Toolkit `pt-table-checksum`
- Physical backups, incremental backups, and point-in-time recovery

## Sources Consulted
- [Percona XtraBackup: Make backups in replication environments](https://docs.percona.com/percona-xtrabackup/8.4/make-backup-in-replication-env.html)
- [Percona XtraBackup command-line option reference](https://docs.percona.com/percona-xtrabackup/8.4/xtrabackup-option-reference.html)
- [Percona XtraBackup: How Percona XtraBackup works](https://docs.percona.com/percona-xtrabackup/8.4/how-xtrabackup-works.html)
- [Percona XtraBackup backup files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Percona XtraBackup: Reduced backup lock time](https://docs.percona.com/percona-xtrabackup/8.4/reduction-in-locks.html)
- [Percona XtraBackup: Server version and backup version comparison](https://docs.percona.com/percona-xtrabackup/8.4/server-backup-version-comparison.html)
- [Percona XtraBackup: Throttling backups](https://docs.percona.com/percona-xtrabackup/8.4/throttling-backups.html)
- [Percona XtraBackup: Connection and privileges needed](https://docs.percona.com/percona-xtrabackup/8.4/privileges.html)
- [MySQL 8.4 Reference Manual: `SHOW REPLICA STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [MySQL 8.4 Reference Manual: Replication and temporary tables](https://dev.mysql.com/doc/refman/8.4/en/replication-features-temptables.html)
- [MySQL 8.4 Reference Manual: Server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [Percona Toolkit: `pt-table-checksum`](https://docs.percona.com/percona-toolkit/pt-table-checksum.html)

## Issues Found
- The `--login-path=backup` option appeared after other XtraBackup arguments. Percona documents login-path selection as the first XtraBackup parameter, so the command was reordered to make credential loading reliable.
- The post used the deprecated `Slave_open_temp_tables` status-variable name. It now uses `Replica_open_temp_tables`, the current MySQL 8.4 and XtraBackup 8.4 name.
- The post presented `--safe-slave-backup` as universally needed for replica backups. Current XtraBackup option documentation says this temporary-table protection is unnecessary with row-based replication. The explanation now scopes it to statement-based replication and explains that XtraBackup may cycle the SQL thread while waiting for replicated temporary tables to close.
- The lag discussion now makes clear that the apply-stop lag window is introduced when `--safe-slave-backup` is used, rather than by every replica backup.
- The phrase "longer incremental strategy" was ambiguous. It was corrected to "an incremental-backup strategy with periodic fulls."
- The replication-environment documentation link pointed to the 8.0 manual while the rest of the post uses the 8.4 documentation. It now points to the current 8.4 page.

## Review Notes
The remaining recommendations are technically sound: replication thread and error checks, GTID-gap and lag checks, source/channel verification, independent storage, backup preparation, isolated restore testing, and binary-log retention for PITR. `Seconds_Behind_Source` is correctly treated as an imperfect signal, especially with slow receiver links, clock changes, delayed replication, or multithreaded apply. Operators should use the Percona XtraBackup major version that matches the source server major version; Percona XtraBackup 8.4 is for MySQL/Percona Server 8.4, while 8.0 servers require the 8.0 series.
