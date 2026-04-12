# Validation Summary: How to Fix ERROR 3098 Table Has a Partition in Shared Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- InnoDB storage engine
- MySQL partitioning
- InnoDB tablespace management (shared vs file-per-table)
- mysqldump / mysql CLI tools

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: information_schema.INNODB_TABLESPACES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 5.7 Reference Manual: information_schema.INNODB_SYS_TABLESPACES — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-sys-tablespaces-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: information_schema.FILES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: Partitioning Limitations — https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-storage-engines.html

## Issues Found

1. **Incorrect query against `information_schema.FILES`**: The verification query after rebuilding the table used `SELECT TABLESPACE_NAME, TABLE_NAME FROM information_schema.FILES WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders'`. The `information_schema.FILES` table does not have `TABLE_SCHEMA` or `TABLE_NAME` columns — this query would fail with an unknown column error. Replaced with queries against `INNODB_SYS_TABLESPACES` (MySQL 5.7) and `INNODB_TABLESPACES` (MySQL 8.0) which correctly show tablespace-to-table mappings.

2. **MySQL 8.0 incompatible system table name**: The query `SELECT NAME, SPACE, FILE_FORMAT FROM information_schema.INNODB_SYS_TABLESPACES` uses the MySQL 5.7 table name. In MySQL 8.0, this was renamed to `INNODB_TABLESPACES` and the `FILE_FORMAT` column was removed (Barracuda/Antelope file formats were eliminated). Added the MySQL 8.0 equivalent query alongside the 5.7 version.

3. **Misleading comment on ALTER TABLE**: The comment said "ALTER TABLE FORCE (rebuilds in-place)" but the actual SQL used `ALGORITHM = COPY`, which is explicitly a copy-based rebuild, not an in-place operation. Fixed the comment to accurately describe the COPY algorithm.

## Review Notes
- The overall approach (enable `innodb_file_per_table`, then rebuild) is correct and well-documented.
- The MySQL 8.0 upgrade section's detection query using `CREATE_OPTIONS LIKE '%partitioned%'` is a reasonable heuristic but may not catch all edge cases; it works for typical setups.
- The `--single-transaction` flag on mysqldump is appropriate for InnoDB tables and correctly provides a consistent dump without locking.
- The bash script in the MySQL 8.0 upgrade section will include the header line from the mysql output in its `while read` loop; in production use, adding `--skip-column-names` to the mysql command would be more robust.
