# Validation Summary: How to Configure MySQL GTID-Based Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.23+ / 8.0.26+ syntax)
- GTID-based replication
- mysqldump
- MySQL binary logging and relay logs

## Sources Consulted
- MySQL 8.0 Reference Manual: GTID Concepts — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-concepts.html
- MySQL 8.0 Reference Manual: Setting Up GTID Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-howto.html
- MySQL 8.0 Reference Manual: Enabling GTID Transactions Online — https://dev.mysql.com/doc/refman/8.0/en/replication-mode-change-online-enable-gtids.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: mysqldump options (--source-data, --set-gtid-purged) — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: Replication and Binary Logging Options — https://dev.mysql.com/doc/refman/8.0/en/replication-options.html

## Issues Found
1. **`--master-data=1` in mysqldump command (Step 4)**: Changed to `--source-data=2`.
   - **What was wrong**: The `--master-data` option is deprecated in MySQL 8.0.26+ in favor of `--source-data`. The rest of the post consistently uses MySQL 8.0.26+ syntax (`CHANGE REPLICATION SOURCE TO`, `log_replica_updates`, `SHOW REPLICA STATUS`, `START REPLICA`), so this was inconsistent. Additionally, `=1` writes an uncommented `CHANGE MASTER TO` statement with binlog file and position into the dump file, which executes on import. This is unnecessary for GTID-based replication (which uses `SOURCE_AUTO_POSITION` instead of binlog positions) and could cause confusion. Changed to `=2` so the binlog position is included as a comment for reference only.
   - **Why**: Consistency with modern MySQL syntax used elsewhere in the post, and to avoid an unnecessary `CHANGE MASTER TO` statement executing during dump import on the replica.

## Review Notes
- The post uses `mysql_native_password` for the replication user. This works in MySQL 8.0 but is deprecated in MySQL 8.4+. The default plugin in MySQL 8.0+ is `caching_sha2_password`. This is acceptable for a general tutorial but readers targeting MySQL 8.4+ should be aware.
- `binlog_format = ROW` is specified in the source config. This variable is deprecated in MySQL 8.0.34 (ROW is the default and only supported format) and removed in MySQL 9.0. Including it is not wrong for MySQL 8.0 but will generate a deprecation warning on newer versions.
- `FLUSH PRIVILEGES` after `CREATE USER` and `GRANT` is unnecessary (these DDL statements automatically update the in-memory grant tables), but it is not harmful and is commonly seen in tutorials.
- The online GTID migration steps correctly follow the documented incremental transition: WARN → ON for enforce_gtid_consistency, then OFF_PERMISSIVE → ON_PERMISSIVE → ON for gtid_mode.
- All SQL syntax, configuration directives, and system variable names are accurate for MySQL 8.0.
