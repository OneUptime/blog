# Validation Summary: How to Understand the key Column in EXPLAIN Output in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (EXPLAIN output, optimizer behavior)
- InnoDB index types and key_len calculation
- SQL DDL (CREATE INDEX, ALTER TABLE)
- MySQL query hints (FORCE INDEX)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Index Hints — https://dev.mysql.com/doc/refman/8.0/en/index-hints.html
- MySQL 8.0 Reference Manual: Descending Indexes — https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual: The utf8mb4 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html

## Issues Found
- **Incorrect claim about NULL key meaning**: The original text stated "A value of `NULL` means no index was used and a full or index scan was performed." An index scan (`type: index`) uses an index and would show a non-NULL `key` value. When `key` is NULL, no index is used at all, so only a full table scan (`type: ALL`) applies. Changed "a full or index scan" to "a full table scan."

## Review Notes
- The `key_len` calculation (INT = 4 bytes, VARCHAR(20) utf8mb4 = 82 bytes, composite = 86 bytes) is correct but implicitly assumes NOT NULL columns. If either column allows NULL, an extra byte would be added per nullable column. This is a common convention in examples and not an error, but readers with nullable columns may see different values.
- The descending index syntax (`created_at DESC`) is only functional in MySQL 8.0+. In MySQL 5.7 and earlier, the DESC keyword is parsed but ignored. The post does not specify a version, which is acceptable since MySQL 8.0 is the current major version.
- The "20-30% of the table" heuristic for when the optimizer skips an index is a commonly cited approximation. The actual threshold varies by table structure, row size, and MySQL version, but this is a reasonable teaching estimate.
