# Validation Summary: How to Use EXPLAIN ANALYZE in MySQL 8.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.18+
- SQL
- EXPLAIN ANALYZE
- Query performance analysis

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

1. **Incorrect EXPLAIN ANALYZE syntax order** (Syntax section): The post showed `EXPLAIN FORMAT=TREE ANALYZE SELECT ...;` but the correct MySQL syntax requires ANALYZE before FORMAT. Fixed to `EXPLAIN ANALYZE FORMAT=TREE SELECT ...;`. The MySQL docs specify the grammar as `EXPLAIN ANALYZE [FORMAT=TREE] select_statement`.

2. **Inaccurate DML warning — INSERT not supported** (Introduction and Best Practices): The post warned against using EXPLAIN ANALYZE on INSERT, UPDATE, or DELETE statements. Per the MySQL 8.0 docs, EXPLAIN ANALYZE supports SELECT and multi-table UPDATE/DELETE statements — INSERT is not supported. Fixed both warnings to accurately reference multi-table UPDATE and DELETE only, and noted that INSERT is not supported by EXPLAIN ANALYZE.

## Review Notes
- The example EXPLAIN ANALYZE outputs are realistic and consistent with the test data setup (75 products per category from 300 total, ~3.33 order items per product from 1000 total).
- The MySQL docs note that FORMAT=TREE is the only supported format for EXPLAIN ANALYZE, which the post correctly states as the default.
- The `actual time` values being in milliseconds is confirmed by the MySQL docs.
- The advice about reading output bottom-up and multiplying `actual time` by `loops` for total cost is correct.
- Single-table UPDATE and DELETE may not be supported by EXPLAIN ANALYZE in all MySQL 8.0 versions — the docs specifically mention "multi-table" UPDATE and DELETE.
