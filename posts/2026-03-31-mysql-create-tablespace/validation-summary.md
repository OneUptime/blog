# Validation Summary: How to Use CREATE TABLESPACE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0)
- InnoDB general tablespaces
- InnoDB storage engine
- SQL DDL statements (CREATE TABLESPACE, DROP TABLESPACE)
- INFORMATION_SCHEMA views (FILES, INNODB_TABLESPACES)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLESPACE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-tablespace.html
- MySQL 8.0 Reference Manual: General Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.0 Reference Manual: DROP TABLESPACE Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-tablespace.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA FILES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: InnoDB Data Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html

## Issues Found
No technical issues found.

## Review Notes
- The `ADD DATAFILE` clause became optional in MySQL 8.0.14+. The post shows it as required in the basic syntax, which is correct for MySQL 5.7 and early 8.0 but could note the optional behavior for 8.0.14+. Not an error since providing `ADD DATAFILE` always works.
- The `FILE_BLOCK_SIZE` section mentions 4096 and 8192 as values that enable compressed row formats. With the default `innodb_page_size` of 16384, values of 1024 and 2048 also enable compressed tables. The statement is not wrong but is incomplete.
- The `INFORMATION_SCHEMA.FILES` query selects `TOTAL_EXTENTS` and `EXTENT_SIZE`, which may return NULL for some InnoDB tablespace entries depending on the MySQL version. The query is syntactically valid and will execute without error.
- The `ENCRYPTION` option for general tablespaces was specifically introduced in MySQL 8.0.13. The post correctly attributes it to MySQL 8.0.
