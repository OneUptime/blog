# Validation Summary: How to Use SQL_CALC_FOUND_ROWS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL_CALC_FOUND_ROWS / FOUND_ROWS()
- MySQL stored procedures
- Keyset pagination

## Sources Consulted
- MySQL 8.0 Reference Manual — FOUND_ROWS(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows
- MySQL 8.0 Reference Manual — SELECT syntax: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — EXPLAIN output: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Query Cache removal: https://dev.mysql.com/doc/refman/8.0/en/query-cache.html

## Issues Found

1. **Misleading EXPLAIN explanation**: The post claimed that running `EXPLAIN` on a `SQL_CALC_FOUND_ROWS` query would show `Using where` in the Extra column "for all matched rows, not just 10." This misrepresents how EXPLAIN works — EXPLAIN shows a query plan (one row per table), not per-row information. The `Using where` flag simply indicates a WHERE clause is applied, regardless of `SQL_CALC_FOUND_ROWS`. Replaced the EXPLAIN example with a plain-language explanation of the runtime behavior: the query takes roughly as long as one without `LIMIT` because MySQL must examine all matching rows to produce the count.

2. **Query caching reference**: The post listed "Query caching (where available) works independently for each query" as a benefit of the two-query approach. The MySQL query cache was deprecated in 5.7.20 and removed entirely in MySQL 8.0. Since this section specifically recommends the modern approach for MySQL 8.0+ users, referencing query caching is misleading. Changed to "Result caching at the application level" which is accurate and version-independent.

## Review Notes
- The deprecation version (8.0.17) is confirmed correct per MySQL release notes.
- The stored procedure pattern using `DECLARE ... DEFAULT (expression)` is valid MySQL syntax.
- The keyset pagination section is accurate and well-explained.
- The post correctly notes that SQL_CALC_FOUND_ROWS offers no performance advantage over two separate queries, which aligns with MySQL team benchmarks cited in the deprecation notice.
