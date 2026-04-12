# Validation Summary: How to Set the Default Storage Engine in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MyISAM storage engine
- MEMORY storage engine
- Percona Toolkit (pt-online-schema-change)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`default_storage_engine`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_storage_engine
- MySQL 8.0 Reference Manual: The MEMORY Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/memory-storage-engine.html
- MySQL 8.0 Reference Manual: SHOW ENGINES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engines.html
- MySQL 8.0 Reference Manual: ALTER TABLE and Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: InnoDB as Default Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/innodb-default-se.html

## Issues Found

1. **MEMORY engine with BLOB column**: The `session_data` CREATE TABLE example used `data BLOB` with `ENGINE=MEMORY`. MEMORY tables cannot contain BLOB or TEXT columns (MySQL error 1163: "The used table type doesn't support BLOB/TEXT columns"). Changed `BLOB` to `VARBINARY(8000)`, which is supported by the MEMORY engine and suitable for session data storage.

2. **Incorrect Online DDL claim for engine conversion**: The post stated that "MySQL's built-in Online DDL" could be used as an alternative for engine conversion on production tables. This is incorrect — `ALTER TABLE ... ENGINE=` always uses the COPY algorithm regardless of Online DDL support. Online DDL (`ALGORITHM=INPLACE` or `ALGORITHM=INSTANT`) does not apply to storage engine changes. Corrected the text to clarify that engine changes always use the COPY algorithm (full table lock) and recommended `pt-online-schema-change` as the production-safe alternative.

3. **Missing RHEL service name in restart command**: The post provided distro-specific config file paths (Ubuntu/Debian vs RHEL) but only showed `sudo systemctl restart mysql` for restarting. On RHEL with MySQL community RPM packages, the service name is `mysqld`, not `mysql`. Added the RHEL-specific restart command to match the existing config path differentiation.

## Review Notes
- The InnoDB vs MyISAM comparison table is accurate. The claim that "MyISAM has no advantages that InnoDB does not also provide as of MySQL 5.7+" is slightly strong — MyISAM still has O(1) `COUNT(*)` without WHERE clause and marginally lower per-row storage overhead — but for practical purposes the recommendation to use InnoDB universally is sound and appropriate for a tutorial audience.
- InnoDB has been the default storage engine since MySQL 5.5 (not just 8.0 as the post implies), but the post's focus on MySQL 8.0 is reasonable for current readers.
- The batch conversion query correctly excludes system schemas (`mysql`, `information_schema`, `performance_schema`, `sys`).
