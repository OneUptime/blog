# Validation Summary: How to Set the Character Set for a MySQL Table

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE, ALTER TABLE, CHARACTER SET, COLLATE syntax)
- information_schema system tables
- pt-online-schema-change (Percona Toolkit)
- utf8mb4 character encoding

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual: Character Sets and Collations (https://dev.mysql.com/doc/refman/8.0/en/charset.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: utf8mb3 vs utf8mb4 (https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes between `ALTER TABLE ... CONVERT TO CHARACTER SET` (re-encodes existing columns) and `ALTER TABLE ... CHARACTER SET` (only changes default for new columns). This is an important distinction that is often confused.
- The warning about MySQL's `utf8` alias being only 3 bytes (utf8mb3) is accurate and valuable guidance.
- The note about default collation varying across server versions is correct: MySQL 5.7 defaults to `utf8mb4_general_ci` while MySQL 8.0+ defaults to `utf8mb4_0900_ai_ci`. The post wisely recommends always specifying an explicit collation.
- The information_schema query uses `TABLE_COLLATION` which is the correct column. MySQL does not expose a separate table-level character set column in information_schema.TABLES; the character set is inferred from the collation name prefix.
