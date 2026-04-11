# Validation Summary: How to Rebuild a MySQL Replica from a Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+ (replication, GTID, Clone Plugin)
- mysqldump
- Percona XtraBackup
- MySQL Clone Plugin
- pt-table-checksum (Percona Toolkit)

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump options — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: Clone Plugin — https://dev.mysql.com/doc/refman/8.0/en/clone-plugin.html
- MySQL 8.0 Reference Manual: RESET MASTER — https://dev.mysql.com/doc/refman/8.0/en/reset-master.html
- MySQL 8.0 Reference Manual: mysqld --initialize-insecure — https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- Percona XtraBackup Documentation — https://docs.percona.com/percona-xtrabackup/8.0/

## Issues Found
1. **`--master-data=2` deprecated**: The mysqldump command used `--master-data=2`, which was deprecated in MySQL 8.0.26 in favor of `--source-data=2`. Since the post consistently uses MySQL 8.0+ syntax elsewhere (`STOP REPLICA`, `CHANGE REPLICATION SOURCE TO`), updated to `--source-data=2` for consistency and forward compatibility.

2. **Incorrect restore comment and unnecessary `-p` flag**: After `mysqld --initialize-insecure`, the root account is created with an empty password (no temporary password is generated). The comment "Get and set temporary root password, then restore" was inaccurate, and `mysql -u root -p` would unnecessarily prompt for a password. Changed to `mysql -u root` with an accurate comment.

3. **Incomplete `CHANGE REPLICATION SOURCE TO` in GTID reset section**: After `RESET REPLICA ALL`, all replication connection parameters are cleared. The command only specified `SOURCE_HOST` and `SOURCE_AUTO_POSITION`, which would fail because `SOURCE_USER`, `SOURCE_PASSWORD`, and `SOURCE_PORT` are required for the replica to connect. Added the missing parameters to match the earlier replication configuration example.

## Review Notes
- `SHOW MASTER STATUS` (used in the "Preparing for Rebuild" section) is deprecated in MySQL 8.2.0+ in favor of `SHOW BINARY LOG STATUS`. It remains valid for MySQL 8.0.x which the post targets, but may need updating for MySQL 8.2+/8.4+.
- `RESET MASTER` in the GTID reset section was deprecated in MySQL 8.4.0 in favor of `RESET BINARY LOGS AND GTIDS`. It is valid for MySQL 8.0.x but should be updated if the post is revised for MySQL 8.4+.
- The XtraBackup `--decompress` step requires the `qpress` (or `zstd` for newer versions) utility to be installed, which is not mentioned. This is a minor documentation gap, not a technical error.
- The `watch` command for monitoring includes `-p` which will prompt for a password interactively, making the watch loop less useful. In practice, users would use a `.my.cnf` credentials file or `--password=` inline.
