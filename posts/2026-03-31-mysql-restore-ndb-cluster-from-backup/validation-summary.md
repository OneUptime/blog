# Validation Summary: How to Restore MySQL NDB Cluster from a Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster
- ndb_restore utility
- NDB Cluster backup and recovery

## Sources Consulted
- MySQL 8.0 Reference Manual: ndb_restore — NDB Cluster Backup Restoration (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-restore.html)
- MySQL 8.0 Reference Manual: NDB Cluster Backup Concepts (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-backup-concepts.html)
- MySQL 8.0 Reference Manual: Restoring from NDB Cluster Backups (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-backup-restore-restore.html)

## Issues Found

1. **Overview said "two phases" instead of three**: The overview stated the restore process involves two phases, but the post itself describes three phases (metadata, data, rebuild indexes). Fixed to say "three phases."

2. **Incorrect backup file naming format**: File names were shown as `BACKUP-<id>.<nodeid>.ctl` but the correct NDB Cluster backup file format includes a fragment number and the files reside in a subdirectory named after the backup ID: `BACKUP-<id>/BACKUP-<id>-0.<nodeid>.ctl`. Fixed to show the correct directory structure and file naming with the `-0` fragment number.

3. **Incorrect option `--remap-column` for restoring to a different database**: The post recommended `--remap-column` for restoring to a different cluster or database. `--remap-column` is used for remapping column values (e.g., auto-increment offsets), not for database remapping. The correct option is `--rewrite-database=<old_db>,<new_db>`. Fixed the text to reference `--rewrite-database`.

4. **Summary incorrectly said "during the data phase"**: The summary advised using `--disable-indexes` during the "data phase," but this option is used during the metadata phase (Phase 1) to prevent index creation when the schema is restored. Fixed to say "during the metadata phase."

## Review Notes
- The `--rewrite-database` option text was fixed in the description, but the command example in the "Restoring to a Different Cluster" section only shows `--include-databases` without an actual `--rewrite-database` flag in the command. If the intent is to remap to a different database name, the command would need `--rewrite-database=olddb,newdb` added. As written, the command filters to a specific database but doesn't remap it, which is still a valid use case for restoring a subset to the same-named database on a different cluster.
- The `ndb_restore` utility does not need to be run physically on each data node — it can be run from any host with access to the backup files and connectivity to the management server. The post's language implies it must run on the data nodes, which is common practice but not a strict requirement.
