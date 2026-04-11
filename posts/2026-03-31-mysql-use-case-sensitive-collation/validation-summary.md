# Validation Summary: How to Use Case-Sensitive Collation in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- utf8mb4 character set and collations
- SQL DDL (CREATE TABLE, ALTER TABLE)
- SQL query-level COLLATE clauses
- MySQL indexing with collation-aware columns

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets and Collations (https://dev.mysql.com/doc/refman/8.0/en/charset-charsets.html)
- MySQL 8.0 Reference Manual: utf8mb4 Collation Sets (https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html)
- MySQL 8.0 Reference Manual: COLLATE clause in expressions (https://dev.mysql.com/doc/refman/8.0/en/charset-collate.html)
- MySQL 8.0 Reference Manual: Column Character Set and Collation (https://dev.mysql.com/doc/refman/8.0/en/charset-column.html)

## Issues Found
1. **Non-existent collation `utf8mb4_unicode_cs`**: The post listed `utf8mb4_unicode_cs` as a case-sensitive collation option for utf8mb4. This collation does not exist in any version of MySQL. While `utf8mb4_unicode_ci` (case-insensitive) exists, there is no corresponding `_cs` counterpart. The only standard case-sensitive utf8mb4 collations in MySQL are `utf8mb4_bin` (all versions) and `utf8mb4_0900_as_cs` (MySQL 8.0+). Removed the incorrect bullet point and clarified that `utf8mb4_bin` is available in all MySQL versions.

## Review Notes
- The post correctly notes that `utf8mb4_0900_as_cs` requires MySQL 8.0+. For users on MySQL 5.7 or earlier, `utf8mb4_bin` is the only built-in case-sensitive option for utf8mb4.
- The distinction between `utf8mb4_bin` (raw binary comparison) and `utf8mb4_0900_as_cs` (Unicode-aware case-sensitive comparison) is worth noting: `_bin` compares byte values directly which can yield unexpected sort orders for accented characters, while `_0900_as_cs` follows Unicode sorting rules. The post could benefit from mentioning this nuance in the future.
- All SQL syntax examples are correct and follow standard MySQL DDL/DML conventions.
- The explanation of collation coercibility in the "Checking Whether a Query Is Case-Sensitive" section is accurate — the explicit COLLATE on the right-hand operand takes precedence over the implicit collation of string literals.
