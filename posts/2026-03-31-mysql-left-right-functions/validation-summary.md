# Validation Summary: How to Use LEFT() and RIGHT() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LEFT(), RIGHT(), SUBSTRING(), LOCATE() string functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_left
- MySQL 8.0 Reference Manual: String Functions — RIGHT() — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_right
- MySQL 8.0 Reference Manual: String Functions — SUBSTRING() — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring
- MySQL 8.0 Reference Manual: How MySQL Uses Indexes — https://dev.mysql.com/doc/refman/8.0/en/mysql-indexes.html

## Issues Found

1. **CHAR(12) too small for sample data**: The `records` table used `CHAR(12)`, but the sample value `'US-SALES-0042'` is 13 characters long. In strict SQL mode this would cause an insertion error; in non-strict mode it would silently truncate the value, breaking the subsequent RIGHT() example. Changed to `CHAR(13)`.

2. **SUBSTRING length off by one**: `SUBSTRING(code, 4, 4)` was described as extracting `'SALES'` from `'US-SALES-0042'`, but it actually extracts `'SALE'` (4 characters starting at position 4). Changed to `SUBSTRING(code, 4, 5)` to correctly extract all 5 characters of `'SALES'`.

3. **Incorrect index usage claim for LIKE with leading wildcard**: The inline comment on `LIKE '%.pdf'` stated it "can use index on the left side", and the note below suggested using LIKE for suffix searches for better performance. In reality, `LIKE '%.pdf'` with a leading wildcard cannot use a B-tree index — only trailing-wildcard patterns like `LIKE 'SKU-%'` benefit from index usage. Updated the comment and note to accurately describe when LIKE can and cannot use indexes.

## Review Notes
- The post correctly notes that LEFT() and RIGHT() count characters, not bytes, under multibyte character sets like utf8mb4. This is accurate for MySQL 5.x and 8.x.
- The advice to use YEAR() and DAY() for actual date columns instead of string extraction is good practice.
- The `UK-MKTG-0017` sample value is only 12 characters, so CHAR(13) accommodates both sample values correctly (CHAR pads shorter values with spaces, which is fine for the examples shown).
