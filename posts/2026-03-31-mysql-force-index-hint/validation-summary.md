# Validation Summary: How to Use FORCE INDEX Hint in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (query optimizer, index hints)
- SQL (SELECT, EXPLAIN, ANALYZE TABLE)

## Sources Consulted
- MySQL 8.0 Reference Manual — Index Hints: https://dev.mysql.com/doc/refman/8.0/en/index-hints.html

## Issues Found
1. **FORCE INDEX does not "disable" full table scans.** The post originally stated FORCE INDEX "disables the full table scan option" and "preventing full table scans." Per the official MySQL docs, FORCE INDEX makes a table scan appear very expensive to the optimizer so it is used only as a last resort — it does not actually prevent table scans. Fixed both occurrences (the FORCE INDEX vs USE INDEX section and the Summary section) to accurately reflect this behavior.

## Review Notes
- MySQL 8.0.20 introduced optimizer hints (`JOIN_INDEX`, `ORDER_INDEX`, `GROUP_INDEX`, `INDEX`) that are intended to supersede the older `FORCE INDEX` / `USE INDEX` / `IGNORE INDEX` syntax. The old-style hints may be deprecated in a future release. The post could mention this in a future update.
- The `FORCE INDEX FOR JOIN` example is used with a comment saying "Force index for the WHERE clause filtering." While technically correct (FOR JOIN covers row-finding operations including WHERE filtering), the comment could be slightly misleading. This is a minor clarity issue, not a technical error.
