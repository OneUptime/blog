# Validation Summary: How to Use UPPER() and LOWER() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- SQL string functions (UPPER, LOWER, UCASE, LCASE)
- utf8mb4 character set and collations
- Functional indexes (MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_upper
- MySQL 8.0 Reference Manual: SQL Mode — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html (PIPES_AS_CONCAT)
- MySQL 8.0 Reference Manual: CREATE INDEX (functional key parts) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- Unicode Character Database: Simple vs Full Case Mappings — https://www.unicode.org/reports/tr44/

## Issues Found

### 1. Incorrect use of `||` as string concatenation (line 50)
- **What was wrong:** The "Converting stored data" section used `UPPER(LEFT(name, 1)) || LOWER(SUBSTRING(name, 2))` to concatenate strings. In MySQL, `||` is the logical OR operator by default, not string concatenation (unlike PostgreSQL or standard SQL). This would produce a boolean result, not a concatenated string.
- **What was changed:** Replaced with `CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name, 2)))` to use MySQL's proper string concatenation function.
- **Why:** MySQL only treats `||` as concatenation when the `PIPES_AS_CONCAT` SQL mode is enabled, which is not the default. Using `CONCAT()` is correct and portable across all MySQL configurations.

### 2. Incorrect claim about German sharp S expansion (line 118)
- **What was wrong:** The post claimed `SELECT UPPER('straße')` returns `'STRASSE'` with the comment "German sharp S expands." MySQL's `UPPER()` function uses simple (one-to-one) case mapping, not full case mapping. It does not expand a single character into multiple characters, so `ß` is not converted to `SS`.
- **What was changed:** Replaced the `straße`/`ISTANBUL` examples with unambiguous multibyte examples (`café` -> `CAFE`, `MUNCHEN` -> `munchen`) and added a note clarifying that MySQL's `UPPER()` does not expand `ß` to `SS`.
- **Why:** The `ß` -> `SS` expansion is a full Unicode case mapping behavior implemented by some databases (e.g., PostgreSQL) but not by MySQL's `UPPER()` function, which performs simple one-to-one character mapping.

## Review Notes
- The post correctly notes that `utf8mb4_0900_ai_ci` is the default collation in MySQL 8.0 and that comparisons are case-insensitive by default.
- The functional index syntax `((LOWER(email)))` with double parentheses is correct for MySQL 8.0.13+.
- The title case section honestly acknowledges the limitation that MySQL has no built-in title case function, which is accurate.
- The advice about index implications of wrapping columns in UPPER/LOWER is sound and important for performance.
