# Validation Summary: How to Fix Corrupt InnoDB Tables in MySQL

## Status
validated

## Post Type
Tutorial / Recovery Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- innodb_force_recovery mode
- mysqldump
- CHECK TABLE
- Binary logging and InnoDB configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Forcing InnoDB Recovery — https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual: InnoDB Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: CHECK TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: MyISAM Startup Options — https://dev.mysql.com/doc/refman/8.0/en/myisam-start.html
- MySQL 8.0 Reference Manual: Troubleshooting InnoDB Data Dictionary Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-troubleshooting-datadict.html

## Issues Found

1. **Incorrect InnoDB error message (line 11)**: The post listed `Table 'mydb.orders' is marked as crashed` as an InnoDB corruption symptom. This is a MyISAM-specific error message (`ER_CRASHED_ON_USAGE`), not InnoDB. Replaced with `InnoDB: Unable to read tablespace`, which is an actual InnoDB corruption error.

2. **CHECK TABLE EXTENDED has no effect on InnoDB (line 19)**: The post showed `CHECK TABLE orders EXTENDED;` as if it provided additional checking. Per MySQL docs, the EXTENDED option is silently ignored for InnoDB tables — only MyISAM benefits from it. Removed the EXTENDED variant to avoid misleading readers.

3. **Missing database directory removal in rebuild step (lines 88-98)**: The post instructed users to remove `ibdata1` and redo logs, then restart and reimport. However, orphaned `.ibd` files left in database directories (e.g., `/var/lib/mysql/mydb/`) would cause `CREATE TABLE` to fail with Error 1813: "Tablespace for table exists." Added `sudo rm -rf /var/lib/mysql/mydb/` to the rebuild instructions.

4. **Outdated redo log path (line 90)**: The post only listed `sudo rm /var/lib/mysql/ib_logfile*` for removing redo logs. In MySQL 8.0.30+, redo logs moved from `ib_logfile0`/`ib_logfile1` in the data directory to `#innodb_redo/` subdirectory. Added `sudo rm -rf '/var/lib/mysql/#innodb_redo/'` to handle both old and new locations.

## Review Notes
- The innodb_force_recovery level descriptions are simplified but acceptable summaries of the official documentation.
- The `--no-tablespaces` flag on mysqldump in force recovery mode is fine but not strictly necessary for InnoDB recovery — it suppresses `CREATE LOGFILE GROUP` and `CREATE TABLESPACE` statements primarily relevant to NDB Cluster.
- The post could benefit from a warning that `innodb_force_recovery` at levels 4-6 makes the database read-only and no DML operations (INSERT, UPDATE, DELETE) are permitted. This is not incorrect as stated but would be helpful context.
- The prevention section's configuration recommendations (`innodb_flush_log_at_trx_commit = 1`, `sync_binlog = 1`) are correct best practices for data durability.
