# Validation Summary: How to Manage MySQL Tablespaces

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MySQL 8.0 / 5.7
- InnoDB Storage Engine
- InnoDB Tablespaces (system, file-per-table, general, undo, temporary)
- information_schema views (FILES, INNODB_TABLESPACES)

## Sources Consulted
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: InnoDB Doublewrite Buffer — https://dev.mysql.com/doc/refman/8.0/en/innodb-doublewrite-buffer.html
- MySQL 8.0 Reference Manual: The System Tablespace — https://dev.mysql.com/doc/refman/8.0/en/innodb-system-tablespace.html
- MySQL 8.0 Reference Manual: General Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table

## Issues Found
1. **Incorrect columns in undo tablespace query**: The query against `information_schema.INNODB_TABLESPACES` used `TABLESPACE_NAME` and `FILE_NAME`, neither of which exist in that view. The correct column for the tablespace name is `NAME`, and `FILE_NAME` is not available in this view. Changed the query to `SELECT NAME, FILE_SIZE, STATE FROM information_schema.INNODB_TABLESPACES WHERE ROW_FORMAT = 'Undo';` which uses valid columns.

2. **Missing version qualification for doublewrite buffer**: The system tablespace description stated it stores "the doublewrite buffer" without version context. Starting in MySQL 8.0.20, the doublewrite buffer was moved to separate files (`#ib_16384_0.dblwr`, `#ib_16384_1.dblwr`). Added "(before MySQL 8.0.20)" to match the version-qualified style already used for the data dictionary and undo logs in the same list.

## Review Notes
- The `information_schema.FILES` queries in the "Viewing Tablespace Information" section are reasonable but the output may vary depending on MySQL version and configuration. The `FILES` table is more complete for NDB Cluster; for InnoDB it provides basic file-level metadata.
- The `CREATE TABLESPACE` syntax with an absolute path for `ADD DATAFILE` requires that the directory exists and is accessible by the MySQL server process. The post could mention this but it is not a technical error.
- `OPTIMIZE TABLE` on InnoDB is internally mapped to `ALTER TABLE ... FORCE` — this is correct behavior but worth noting for readers who might expect OPTIMIZE to behave like MyISAM.
- All SQL syntax, configuration directives, and `ALTER TABLE ... TABLESPACE` commands are correct for MySQL 5.7+ and 8.0.
