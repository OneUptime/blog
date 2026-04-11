# Validation Summary: How to Troubleshoot MySQL Character Encoding Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- InnoDB storage engine
- MySQL character sets (utf8, utf8mb4, latin1)
- MySQL collations (utf8mb4_unicode_ci)
- PHP PDO (connection string example)
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets, Collations, Unicode — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: ALTER DATABASE — https://dev.mysql.com/doc/refman/8.0/en/alter-database.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: The utf8mb4 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html
- MySQL 8.0 Reference Manual: SET NAMES Statement — https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual: CONVERT Function — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#function_convert
- MySQL 8.0 Reference Manual: InnoDB Limits (index key prefix length) — https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 8.0 Reference Manual: information_schema.schemata — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html
- MySQL 8.0 Reference Manual: information_schema.columns — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- Unicode code chart for U+00E9 (LATIN SMALL LETTER E WITH ACUTE) — UTF-8 encoding is C3 A9

## Issues Found
1. **Line 14 — Incorrect character in mojibake example**: The post said "Garbled text like `Ã©` instead of `e`". The original character before mojibake is `é` (e with acute accent, U+00E9), not plain `e` (U+0065). Fixed to "instead of `é`".

2. **Line 71 — Incorrect character in hex encoding explanation**: The post said "`C3A9` is the UTF-8 encoding of `e`". The hex bytes `C3 A9` are the UTF-8 encoding of `é` (U+00E9), not plain `e` (which is simply `65` in UTF-8/ASCII). Fixed to "UTF-8 encoding of `é`".

## Review Notes
- All SQL syntax (`SHOW VARIABLES`, `ALTER DATABASE`, `ALTER TABLE CONVERT TO`, `SET NAMES`, `CONVERT(BINARY CONVERT(...))`, `information_schema` queries) is correct and current for MySQL 5.7 and 8.0.
- The `innodb_large_prefix` note for MySQL 5.7 is accurate. It was ON by default from 5.7.7 and removed in 8.0. The post's statement that it "requires innodb_large_prefix = ON in MySQL 5.7" is slightly simplified (it was already ON by default in later 5.7.x) but not wrong.
- The prefix index length of 191 is correctly calculated (191 * 4 = 764 bytes, within the 767-byte limit).
- The `utf8mb4_unicode_ci` collation is a solid recommendation. For MySQL 8.0+, `utf8mb4_0900_ai_ci` is the new default collation, but `utf8mb4_unicode_ci` remains valid and widely used. This could be mentioned in a future update.
- In MySQL 8.0.28+, `utf8mb3` is the preferred name for the old 3-byte charset (with `utf8` as a deprecated alias). The post's use of `utf8` to refer to the 3-byte charset is still accurate and widely understood.
