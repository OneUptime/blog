# Validation Summary: What Is a Tablespace in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB tablespaces (system, file-per-table, general, undo, temporary)
- INFORMATION_SCHEMA.FILES
- Transportable tablespaces

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-tablespace.html
- MySQL 8.0 Reference Manual: The System Tablespace — https://dev.mysql.com/doc/refman/8.0/en/innodb-system-tablespace.html
- MySQL 8.0 Reference Manual: File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: General Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.0 Reference Manual: Undo Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 Reference Manual: Temporary Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-temporary-tablespace.html
- MySQL 8.0 Reference Manual: Transportable Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-table-import.html

## Issues Found
1. **System Tablespace description in summary table was incorrect for MySQL 8.0.** The table described the system tablespace as "Shared storage for data dictionary and undo logs." In MySQL 8.0, the data dictionary was moved to `mysql.ibd` and undo logs are stored in separate undo tablespaces by default. The body text already correctly stated it "primarily holds the change buffer," contradicting the table. Fixed the table description to "Shared storage for change buffer and system data."

2. **Missing `UNLOCK TABLES` in transportable tablespace procedure.** The Transporting Tablespaces section showed `FLUSH TABLES orders FOR EXPORT;` on the source server but omitted the required `UNLOCK TABLES;` step afterward. Per MySQL documentation, after copying the `.ibd` and `.cfg` files, you must release the flush lock with `UNLOCK TABLES;`. Added the missing statement.

## Review Notes
- The `INFORMATION_SCHEMA.FILES` query for viewing tablespace sizes uses `TOTAL_EXTENTS * EXTENT_SIZE`, which may return NULL for some tablespace types. This is acceptable for an introductory reference but readers should be aware of this limitation.
- The `innodb_file_per_table` default changed to ON in MySQL 5.6.6, so saying "recommended since MySQL 5.6" is accurate.
- The `CREATE UNDO TABLESPACE` and `ALTER UNDO TABLESPACE ... SET ACTIVE` syntax requires MySQL 8.0.14+, which is not explicitly noted in the post. This is a minor version caveat readers should be aware of.
