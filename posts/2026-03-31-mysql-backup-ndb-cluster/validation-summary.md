# Validation Summary: How to Back Up MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster
- ndb_mgm (NDB Cluster management client)
- NDB Cluster backup and restore
- cron (for backup automation)
- rsync (for remote backup transfer)

## Sources Consulted
- MySQL 8.4 Reference Manual: Using The NDB Cluster Management Client to Create a Backup — https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-backup-using-management-client.html
- MySQL 8.4 Reference Manual: NDB Cluster Backup Concepts — https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-backup-concepts.html
- MySQL 8.4 Reference Manual: ndb_restore — Restore an NDB Cluster Backup — https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-programs-ndb-restore.html

## Issues Found

1. **Data file naming missing fragment number**: The blog showed backup data files as `BACKUP-<id>.<nodeid>.Data`, but the correct format is `BACKUP-<id>-0.<nodeid>.Data` (the `-0` is a fragment number). Fixed in the file naming description, the "Checking Available Backups" section, and the "Verifying Backup Integrity" section.

2. **Backup directory structure incorrect**: The blog showed backup files stored flat in the BackupDataDir. In reality, NDB Cluster stores backups in subdirectories named `BACKUP-<id>/` under the BackupDataDir. Updated the "Checking Available Backups" section to first list directories, then show files inside a specific backup directory. Also fixed the verification command to use the correct subdirectory path.

3. **Inaccurate .log file description**: The blog described the `.log` file as "Redo log for point-in-time recovery." Per the official docs, it is a log of committed transactions that occurred during the backup process, used to ensure backup consistency during restore — not a redo log for arbitrary point-in-time recovery. Changed to "Log of committed transactions during backup."

## Review Notes
- The `BackupDataDir` configuration parameter and `ndb_mgm -e "start backup"` command are correct.
- The cron job and rsync script are reasonable approaches for automation and remote backup transfer.
- The rsync script's `ls -d $BACKUP_DIR/BACKUP-*` correctly targets subdirectories, which is consistent with the corrected directory structure.
- The post does not cover `ndb_restore` for restoring backups, which could be a useful follow-up topic.
