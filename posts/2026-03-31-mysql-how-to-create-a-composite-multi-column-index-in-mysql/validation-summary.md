# Validation Summary: How to Create a Composite (Multi-Column) Index in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (composite/multi-column indexes)
- SQL DDL (CREATE INDEX, ALTER TABLE ADD INDEX)
- EXPLAIN query analysis
- SHOW INDEX metadata inspection

## Sources Consulted
- MySQL 8.0 Reference Manual: Multiple-Column Indexes — https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Index Skip Scan — https://dev.mysql.com/doc/refman/8.0/en/range-optimization.html#range-access-skip-scan

## Issues Found
No technical issues found.

## Review Notes
- The EXPLAIN output showing `key_len: 86` is accurate for a composite index on `INT NOT NULL` (4 bytes) + `VARCHAR(20) NOT NULL` with utf8mb4 charset (82 bytes), which is the default in MySQL 8.0.
- The statement "MySQL can only use one index per table in most cases" is a simplification — MySQL supports index merge optimizations — but the "in most cases" qualifier makes it acceptable, and the composite index recommendation is correct regardless.
- MySQL 8.0.13+ introduced Index Skip Scan, which can sometimes use a composite index even when the leading column is absent from the WHERE clause. The post's description of the leftmost prefix rule is the standard documented behavior and correct as a general teaching guide. A future update could mention skip scan as an advanced note.
