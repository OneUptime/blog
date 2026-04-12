# Validation Summary: What Is Row Format in MySQL InnoDB

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB row formats (REDUNDANT, COMPACT, DYNAMIC, COMPRESSED)
- information_schema
- pt-online-schema-change, gh-ost

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Row Formats — https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: innodb_default_row_format — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_default_row_format
- MySQL 8.0 Reference Manual: InnoDB File Format (removal notes) — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-format.html
- MySQL 8.0 Reference Manual: innodb_large_prefix (removal notes) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_large_prefix
- MySQL 8.0 Reference Manual: InnoDB Table Compression — https://dev.mysql.com/doc/refman/8.0/en/innodb-compression-usage.html

## Issues Found

1. **KEY_BLOCK_SIZE missing valid value 1**: The post listed valid values as "2, 4, 8, or 16" but the MySQL documentation specifies valid values are 1, 2, 4, 8, or 16. Fixed by adding 1 to the list.

2. **Barracuda file format presented as a current requirement**: The post stated "DYNAMIC and COMPRESSED require the Barracuda InnoDB file format" as a general fact. The `innodb_file_format` system variable (and the Antelope/Barracuda distinction) was deprecated in MySQL 5.7.7 and removed in MySQL 8.0. Fixed by rewriting the section to clarify this was a MySQL 5.6/5.7 requirement that no longer applies in 8.0.

3. **`innodb_large_prefix` described as "enabled by default in MySQL 8.0"**: This variable was deprecated in MySQL 5.7.7 and removed in MySQL 8.0. In 8.0, the 3072-byte index prefix limit for DYNAMIC/COMPRESSED is unconditional. Fixed by noting the variable was removed and the behavior is always active in 8.0.

## Review Notes
- The core explanations of how each row format handles variable-length columns and overflow pages are accurate.
- The SQL examples are all syntactically correct and functional.
- The ~20% storage reduction claim for COMPACT vs REDUNDANT aligns with the MySQL documentation.
- The recommendation of COMPRESSED for read-heavy workloads is sound since compression/decompression overhead is most impactful on writes.
- The post is focused on MySQL 8.0 but the version-specific corrections above ensure readers aren't confused by references to removed system variables.
