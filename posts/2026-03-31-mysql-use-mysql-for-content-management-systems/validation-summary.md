# Validation Summary: How to Use MySQL for Content Management Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- SQL DDL (CREATE TABLE, indexes, foreign keys, ENUM, FULLTEXT)
- SQL DML (INSERT, SELECT, UPDATE)
- MySQL Full-Text Search (BOOLEAN MODE)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — FULLTEXT indexes: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — GROUP BY handling and ONLY_FULL_GROUP_BY: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual — INSERT ... SELECT syntax: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual — Covering indexes / composite indexes: https://dev.mysql.com/doc/refman/8.0/en/glossary.html#glos_covering_index

## Issues Found

1. **Missing GROUP BY clause in "Querying Published Content" query.** The query used `GROUP_CONCAT()` without a `GROUP BY` clause. Since MySQL 5.7.5, the default `sql_mode` includes `ONLY_FULL_GROUP_BY`, which causes this query to fail with an error about non-aggregated columns in the SELECT list. **Fix:** Added `GROUP BY c.id` between the WHERE and ORDER BY clauses.

2. **Incorrect use of "covering index" terminology in the Summary section.** The index `idx_type_status_published (content_type_id, status, published_at)` was described as a "covering index." A covering index must include all columns the query references so that MySQL can satisfy it entirely from the index without table row lookups. This index only covers the filter and sort columns, not the SELECT columns (slug, title, excerpt, etc.), so it is a composite index, not a covering index. **Fix:** Changed "covering index" to "composite index."

## Review Notes
- The `content_taxonomies` junction table does not include foreign key constraints to `content(id)` or `taxonomies(id)`, unlike the other tables which consistently use FK constraints. This is not necessarily wrong (some designs omit FKs on junction tables for performance), but it is inconsistent with the rest of the schema.
- The version-computation subquery in the revision INSERT has a potential race condition under concurrent writes (two simultaneous inserts could compute the same version number). The UNIQUE KEY would catch this with a duplicate key error, but a production system would typically wrap this in a transaction with a lock. This is acceptable for a tutorial context.
- FULLTEXT indexes on InnoDB have been supported since MySQL 5.6. The post does not mention a minimum version requirement, which is fine since MySQL 5.6 is very old at this point.
