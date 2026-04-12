# Validation Summary: How to Implement Search and Filtering in APIs with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (FULLTEXT indexes, LIKE operator, BOOLEAN MODE full-text search)
- Node.js with Express
- mysql2 driver (`pool.query` with parameterized placeholders)
- REST API design (query parameters, pagination)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: String Comparison Functions (LIKE) — https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- mysql2 npm package documentation — https://github.com/sidorares/node-mysql2
- Express.js API Reference — https://expressjs.com/en/api.html

## Issues Found
- **Parameter ordering bug in full-text search handler**: When both `q` and `category_id` are provided, the SQL query has three placeholders in this order: (1) `AGAINST(?)` in the SELECT clause for relevance_score, (2) `AGAINST(?)` in the WHERE clause, (3) `category_id = ?` in the WHERE clause. The original code passed params as `[...params, q + '*']` which evaluates to `[q+'*', category_id, q+'*']`, mapping `category_id` to the WHERE MATCH placeholder and `q+'*'` to the category_id placeholder — swapping the two. Fixed by changing to `[q + '*', ...params]` which correctly produces `[q+'*', q+'*', category_id]`, matching the placeholder order in the query.

## Review Notes
- The LIKE escape comment says "to prevent injection" — technically it prevents LIKE pattern injection (unintended wildcards), not SQL injection (which the parameterized query already handles). This is a minor wording nuance, not a technical error.
- The code uses `pool.query()` rather than `pool.execute()`. In mysql2, `query()` escapes values client-side while `execute()` uses server-side prepared statements. Both are safe against SQL injection; the approach shown is the standard documented pattern.
- The `parseInt` calls without a radix argument default to base 10 for typical numeric strings, which is fine for this use case.
