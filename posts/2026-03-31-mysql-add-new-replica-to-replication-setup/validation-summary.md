# Validation Summary: How to Add a New Replica to an Existing MySQL Replication Setup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (replication, GTID-based replication)
- mysqldump
- Percona XtraBackup
- MySQL Clone Plugin
- Linux shell utilities (scp, rsync, watch, systemctl)

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump options — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: Clone Plugin — https://dev.mysql.com/doc/refman/8.0/en/clone-plugin.html
- MySQL 8.0 Reference Manual: GTID replication — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html
- MySQL 8.0 Reference Manual: Replication server options — https://dev.mysql.com/doc/refman/8.0/en/replication-options.html
- Percona XtraBackup 8.0 Documentation — https://docs.percona.com/percona-xtrabackup/8.0/

## Issues Found
1. **`--master-data=2` deprecated in MySQL 8.0.26+**: The mysqldump command used `--master-data=2`, which was deprecated in MySQL 8.0.26 in favor of `--source-data=2`. Since the post consistently uses modern MySQL 8.0.23+/8.0.26+ naming conventions everywhere else (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`, `log_replica_updates`), this was changed to `--source-data=2` for consistency.

2. **`WATCH` command in SQL code block**: The monitoring section had `WATCH -n 5 "..."` inside a SQL code block. `watch` is a Linux shell command (lowercase), not a SQL statement. Fixed by separating it into its own bash code block with correct lowercase `watch`.

## Review Notes
- The `FLUSH PRIVILEGES` in the replication user creation section is unnecessary after `CREATE USER` and `GRANT` statements (these automatically update the in-memory privilege tables), but it is harmless and commonly seen in tutorials, so it was left as-is.
- The XtraBackup `--decompress` step requires the `qpress` package to be installed, which is not mentioned. This is a common prerequisite that readers may need to install separately.
- The post correctly covers the three main seeding methods and properly uses GTID-based replication throughout.
- All SQL syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`) uses the modern MySQL 8.0.23+ naming, which is appropriate.
