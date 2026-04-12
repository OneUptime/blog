# Validation Summary: How to Use InnoDB File-Per-Table Tablespaces in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.6+, 8.0+)
- InnoDB storage engine
- InnoDB file-per-table tablespaces
- Percona XtraBackup
- pt-online-schema-change

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces (https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html)
- MySQL 8.0 Reference Manual: innodb_file_per_table system variable (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table)
- MySQL 8.0 Reference Manual: information_schema.FILES table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html)
- MySQL 8.0 Reference Manual: information_schema.INNODB_TABLES table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: General Tablespaces (https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html)

## Issues Found
No technical issues found.

## Review Notes
- The `information_schema.INNODB_TABLES` table (with `SPACE_TYPE` column) is specific to MySQL 8.0+. In MySQL 5.7, the equivalent was `INNODB_SYS_TABLES` and did not include `SPACE_TYPE`. Since the post doesn't specify a MySQL version for that query, readers on 5.7 may need to adjust. This is a minor version-awareness note, not an error.
- The post correctly omits `.frm` files from the directory listing, which is accurate for MySQL 8.0+ where the data dictionary replaced `.frm` files.
