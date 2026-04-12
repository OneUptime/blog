# Validation Summary: How to Use Functional Indexes in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.13+
- Functional (expression) indexes
- JSON indexing with `->>` operator and CAST
- EXPLAIN for query plan analysis

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Functional Key Parts — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts
- MySQL 8.0 Reference Manual: JSON Path Syntax and the ->> operator — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Release Notes for 8.0.13 — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html

## Issues Found
- **Composite index referenced nonexistent column**: The "Composite Functional Index" example used `event_type` as a column in the `events` table, but the table was defined earlier with `event_name`, not `event_type`. Running the ALTER TABLE would fail with "Unknown column 'event_type'". Changed `event_type` to `event_name` and renamed the index to `idx_year_name` for consistency.

## Review Notes
- The `LOWER(email)` functional index example for case-insensitive search is valid, though worth noting that MySQL 8's default collation (`utf8mb4_0900_ai_ci`) is already case-insensitive. The technique is most useful when working with case-sensitive collations like `utf8mb4_bin`.
- The `LENGTH()` function returns byte length, not character length. For multi-byte character sets, `CHAR_LENGTH()` may be more appropriate depending on intent. The example is technically correct as written.
- All SQL syntax for functional indexes (double parentheses, CREATE INDEX, ALTER TABLE ADD INDEX) is correct per MySQL 8.0.13+ documentation.
- The explanation of functional indexes as hidden generated columns is accurate per MySQL internals documentation.
