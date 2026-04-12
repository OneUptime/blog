# Validation Summary: How to Configure InnoDB Strict Mode in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7+, 8.0)
- InnoDB storage engine
- InnoDB strict mode (`innodb_strict_mode`)
- InnoDB row formats (DYNAMIC, COMPRESSED, REDUNDANT)
- InnoDB KEY_BLOCK_SIZE compression

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual — InnoDB Limits: https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 5.7 Release Notes (5.7.7 changelog for default value change)

## Issues Found
No technical issues found.

## Review Notes
- The claim that `innodb_strict_mode` defaults to ON since MySQL 5.7.7 is confirmed by the MySQL 5.7.7 release notes.
- The row size limit of 8126 bytes cited in the error message example is the actual value MySQL uses in its error output for 16KB pages with REDUNDANT/COMPACT row formats. The official docs approximate this as "about 8000 bytes," but the blog correctly quotes the error message verbatim.
- The `ROW_FORMAT=DYNAMIC KEY_BLOCK_SIZE=8` example correctly demonstrates an invalid combination — KEY_BLOCK_SIZE is only valid with ROW_FORMAT=COMPRESSED.
- All SQL syntax (`SET SESSION`, `SET GLOBAL`, `SHOW VARIABLES LIKE`, `information_schema.TABLES` query) is correct.
- The `innodb_strict_mode` variable is confirmed as both session and global scope, and dynamic (can be changed at runtime without restart).
- The wide_table row size example with 10 VARCHAR(300) columns in REDUNDANT format is illustrative. Whether it triggers the error depends on the character set (it would with utf8mb4 default in MySQL 8.0 but not necessarily with latin1). The concept being demonstrated is correct.
