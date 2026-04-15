# Validation Summary: How to Translate MySQL Queries to ClickHouse SQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, functions, EXPLAIN, mutations, dictionaries)
- MySQL (SQL dialect, date functions, GROUP BY behavior, EXPLAIN)

## Sources Consulted
- ClickHouse documentation: SQL syntax, aggregate functions (`count()`, `any()`), `ifNull()`, `toMonth()`, `now()`, `INTERVAL`, `EXPLAIN` / `EXPLAIN PIPELINE`, `generateUUIDv4()`, `ALTER TABLE ... UPDATE/DELETE` mutations
- MySQL documentation: `ONLY_FULL_GROUP_BY` SQL mode, `IFNULL()`, `DATE_SUB()`, `MONTH()`, `EXPLAIN`, window functions (MySQL 8.0+)

## Issues Found
No technical issues found.

## Review Notes
- The GROUP BY section notes that MySQL "allows" non-aggregated columns not in GROUP BY. This is true when `ONLY_FULL_GROUP_BY` is disabled, but since MySQL 5.7.5+ this mode is enabled by default, meaning modern MySQL would also reject such queries by default. The post's characterization as "allowed but ambiguous" is still accurate for many real-world MySQL deployments where this mode is disabled.
- The Key Incompatibilities table lists `JOIN on arbitrary columns` as an incompatibility. ClickHouse does support JOINs on arbitrary columns; the recommendation to use dictionaries for dimension tables is a performance optimization, not a strict limitation. The table header "ClickHouse Alternative" makes this acceptable as presented.
- All ClickHouse SQL examples use correct, current syntax and idiomatic patterns (e.g., `count()` instead of `count(*)`).
