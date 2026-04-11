# Validation Summary: How to Use SHOW COLLATION in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- SHOW COLLATION statement
- information_schema.COLLATIONS table
- MySQL character sets and collations (utf8mb4, latin1)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW COLLATION Statement (https://dev.mysql.com/doc/refman/8.0/en/show-collation.html)
- MySQL 8.0 Reference Manual: Unicode Character Sets (https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLLATIONS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-collations-table.html)
- MySQL 8.0.1: Accent and Case Sensitive Collations for utf8mb4 (https://dev.mysql.com/blog-archive/mysql-8-0-1-accent-and-case-sensitive-collations-for-utf8mb4/)

## Issues Found
1. **Non-existent collation `utf8mb4_unicode_cs`**: In the "Understanding Collation Naming" section, the post listed `utf8mb4_unicode_cs` as an example of a case-sensitive collation. This collation does not exist in any version of MySQL. Replaced with `utf8mb4_0900_as_cs` (Unicode 9.0 rules, accent-sensitive, case-sensitive), which is a real collation available in MySQL 8.0+, and updated its description accordingly.

## Review Notes
- All other collation IDs in the sample output are correct (utf8mb4_0900_ai_ci = 255, utf8mb4_unicode_ci = 224, utf8mb4_bin = 46, latin1_swedish_ci = 8).
- The SHOW COLLATION syntax, LIKE/WHERE filtering, and information_schema query are all correct.
- The COLLATE clause usage in comparison and ORDER BY examples is syntactically correct.
- The collation suffix meanings (_ci, _cs, _ai, _as, _bin) are all accurate.
- The post focuses on MySQL 8.0+ where utf8mb4_0900_ai_ci is the default collation for utf8mb4. This is correct and current.
