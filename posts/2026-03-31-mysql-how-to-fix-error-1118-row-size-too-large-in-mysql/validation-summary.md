# Validation Summary: How to Fix ERROR 1118 Row Size Too Large in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB row formats (COMPACT, REDUNDANT, DYNAMIC, COMPRESSED)
- MySQL information_schema
- MySQL configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual — Limits on Table Column Count and Row Size: https://dev.mysql.com/doc/refman/8.0/en/column-count-limit.html
- MySQL 8.0 Reference Manual — innodb_strict_mode: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_strict_mode
- MySQL 8.0 Reference Manual — innodb_default_row_format: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_default_row_format
- MySQL 8.0 Reference Manual — Server Error Message Reference (ERROR 1118): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
1. **Fix 3 example had a logical inconsistency**: The example showed a `CREATE TABLE` that fails with ERROR 1118 (so the table is never created), immediately followed by an `ALTER TABLE documents` on that non-existent table. Fixed by showing the corrected `CREATE TABLE` with `TEXT` columns as the primary fix, and adding the `ALTER TABLE` variant separately with a note that it applies when the table already exists.

## Review Notes
- The error messages shown (both the InnoDB ~8126 byte limit and the MySQL server 65535 byte limit) are accurate representations of real MySQL error output.
- The approximate 8,126-byte InnoDB inline row size limit for COMPACT/REDUNDANT formats with 16KB pages is correct.
- The `innodb_strict_mode = OFF` fix (Fix 2) only bypasses the InnoDB-level row size check (~8126 bytes), not the MySQL server-level 65535-byte row size limit. The post correctly warns this is a temporary workaround, but readers should be aware of this distinction.
- All SQL syntax is correct and would execute as expected on MySQL 5.7+ and 8.0+.
- The `character_maximum_length * 4` calculation in the diagnostic query is correct for utf8mb4 encoding; it will return NULL for non-character columns, which is acceptable for its diagnostic purpose.
- Since MySQL 8.0, the default row format is already DYNAMIC, so Fix 1 is most relevant for tables migrated from older MySQL versions or explicitly created with COMPACT/REDUNDANT format.
