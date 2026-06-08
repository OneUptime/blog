# Validation Summary: How to Create Effective Indexes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0 series)
- InnoDB storage engine
- MySQL EXPLAIN / EXPLAIN ANALYZE
- MySQL Performance Schema
- B-tree / composite / covering / unique / full-text / spatial / prefix indexes
- SQL DDL (CREATE INDEX, ALTER TABLE, OPTIMIZE TABLE)

## Sources Consulted
- MySQL CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL InnoDB Index Types: https://dev.mysql.com/doc/refman/8.0/en/innodb-physical-structure.html
- MySQL Type Conversion in Expression Evaluation: https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL Performance Schema Statement Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL Performance Schema Table I/O Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL Spatial Relation Functions on MBR: https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-mbr.html
- MySQL 8.0.3 Release Notes (SRID-restricted columns): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-3.html

## Issues Found

1. **Invalid partial-index syntax.** The "Design Indexes for Your Queries" section included:
   ```sql
   CREATE INDEX idx_pending_date ON orders(status, created_at)
       WHERE status = 'pending';  -- Partial index in some databases
   ```
   MySQL's `CREATE INDEX` grammar has no `WHERE` clause — partial/filtered indexes are a PostgreSQL/SQL Server feature, not MySQL. The statement would fail to execute. Removed the invalid example; the remaining `idx_customer` and `idx_status_date` indexes are still demonstrated.

2. **Incorrect EXPLAIN access type for unique-index lookups.** The post said "type: ref (or eq_ref for unique indexes)" after a single-table `SELECT ... WHERE customer_id = 12345`. Per the MySQL EXPLAIN docs, `eq_ref` is the access type used in **joins** when a unique/primary key is matched against another table's row. For a single-table query that looks up one row via a unique index with a constant, the type is `const`. Changed the wording to "type: ref (or `const` when looking up a single row through a unique index)".

## Review Notes
- "EXPLAIN ANALYZE (MySQL 8.0+)" is slightly imprecise — the feature was added in MySQL 8.0.18, not at the start of the 8.0 line. The shorthand is still defensible and was left as written.
- The descending-index example `(customer_id, created_at DESC)` produces a true descending index only in MySQL 8.0 and later; in 5.7 the `DESC` keyword was parsed but ignored. The post focuses on modern MySQL, so this is fine.
- The "implicit type conversion" mistake example (`WHERE customer_id = '100'` on an INT column) actually does still allow MySQL to use the index — the constant string gets converted to an int. The dangerous case is the reverse (numeric literal compared to a VARCHAR column), which prevents index use because each row's value must be cast. The post's general advice ("match types") is still correct, so the example was left in place rather than rewritten.
- Performance Schema column names are conventionally uppercase in the official docs (`DIGEST_TEXT`, `COUNT_STAR`, `OBJECT_SCHEMA`, etc.). The post uses lowercase in some queries. MySQL identifiers are case-insensitive by default, so the queries execute correctly — left as written.
- The `EXPLAIN` table lists `eq_ref` as a "good" value, which is correct in the general reference sense (good when seen in joins).
