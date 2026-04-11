# Validation Summary: How to Convert JSON to Relational Rows with JSON_TABLE() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- JSON_TABLE() function
- JSON data type
- SQL aggregation (GROUP BY, COUNT, SUM)
- EXPLAIN query plans

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 12.18.6 "JSON Table Functions" (https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html)
- MySQL 8.0 Reference Manual, Section 11.5 "The JSON Data Type" (https://dev.mysql.com/doc/refman/8.0/en/json.html)

## Issues Found

1. **Basic Syntax: ON EMPTY / ON ERROR clause order reversed** (line 24). The syntax template showed `[on_error] [on_empty]` but MySQL requires `ON EMPTY` before `ON ERROR`. Fixed to `[on_empty] [on_error]`.

2. **ON ERROR example: clause order reversed** (lines 110-112). The example placed `DEFAULT -1.00 ON ERROR` before `DEFAULT 0.00 ON EMPTY`. MySQL syntax mandates `ON EMPTY` precedes `ON ERROR`. Swapped the two lines.

3. **Nested Objects example: incorrect query structure** (lines 127-142). The query selected `item.product` from a fabricated subquery `JOIN (SELECT 1) item ON TRUE`, but `NESTED PATH` columns are part of the same `JSON_TABLE()` alias. The column should be referenced as `ord.product` with no JOIN needed. Removed the bogus JOIN and fixed the column reference.

## Review Notes
- The `\G` in the EXPLAIN example is a mysql CLI formatting directive, not standard SQL. This is fine for a MySQL-focused tutorial but readers using GUI tools or connectors should be aware it won't work outside the mysql command-line client.
- The post correctly notes that JSON_TABLE() was introduced in MySQL 8.0. More precisely, it was added in MySQL 8.0.4, but the "MySQL 8.0" level of specificity is appropriate for a blog post.
- The performance advice about generated columns and indexes is sound and well-placed.
