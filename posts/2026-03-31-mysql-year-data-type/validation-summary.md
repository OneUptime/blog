# Validation Summary: How to Use YEAR Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (YEAR data type, DATE functions, DDL, DML)
- SQL (CREATE TABLE, INSERT, SELECT, GROUP BY, WHERE, BETWEEN)

## Sources Consulted
- MySQL 8.0 Reference Manual: The YEAR Type — https://dev.mysql.com/doc/refman/8.0/en/year.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Release Notes (8.0.19) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html
- MySQL 8.0 Reference Manual: 2-Digit YEAR(2) Limitations and Migrating to 4-Digit YEAR — https://dev.mysql.com/doc/refman/5.7/en/migrating-from-year2.html

## Issues Found

1. **YEAR(4) deprecation version incorrect**: The post stated `YEAR(4)` display-width was deprecated in MySQL 8.0.17+. It was actually deprecated in MySQL 8.0.19. The 8.0.17 deprecation applied to integer type display widths (INT, SMALLINT, etc.), not YEAR. Fixed the version number to 8.0.19.

2. **Two-digit year input incorrectly described as deprecated**: The section title said "Two-Digit Year Input (Deprecated)" and the text stated "This behavior is deprecated." In reality, two-digit year *inputs* are still supported in MySQL 8.0 and follow the same conversion rules (00-69 -> 2000-2069, 70-99 -> 1970-1999). What was actually removed in MySQL 8.0 was the `YEAR(2)` display type. Fixed the section title and text to accurately describe the current behavior.

## Review Notes
- All SQL examples are syntactically correct and would execute as shown.
- The YEAR range (1901-2155), storage size (1 byte), and zero value (0000) are all accurate per MySQL documentation.
- The error behavior shown for out-of-range insertion (1800) is correct for MySQL 8.0's default strict SQL mode.
- The comparison with SMALLINT (2 bytes, -32768 to 32767) is accurate.
- Book titles and authors in the publications example are real; ISBNs appear plausible for the referenced editions.
- The `YEAR(CURDATE())` usage for getting the current year is correct.
