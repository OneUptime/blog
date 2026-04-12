# Validation Summary: How to Use EXPLAIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- EXPLAIN statement
- Query execution plans
- Index hints (USE INDEX)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: EXPLAIN Statement (https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- MySQL 8.0 Reference Manual: Index Hints (https://dev.mysql.com/doc/refman/8.0/en/index-hints.html)

## Issues Found
1. **`select_type: PRIMARY` description was too narrow** (line 72): The post described `PRIMARY` as "outermost SELECT in a union," but per MySQL documentation, `PRIMARY` is the outermost SELECT whenever subqueries or unions are present, not just unions. Fixed to: "outermost SELECT when subqueries or unions are present."

2. **"Forcing an Index" section used misleading terminology** (lines 159-161): The heading said "Forcing an Index" and the text said "you can force one," but the SQL example used `USE INDEX`, which is a hint (the optimizer can still choose a table scan). `FORCE INDEX` is the MySQL directive that actually forces index usage. Changed the heading to "Using Index Hints" and the text to "you can hint which one to use" to accurately describe the `USE INDEX` behavior.

## Review Notes
- The access type list (system, const, eq_ref, ref, range, index, ALL) omits less common types like `fulltext`, `ref_or_null`, `index_merge`, `unique_subquery`, and `index_subquery`. This is acceptable for a tutorial-level post but could be noted in a future update.
- The post correctly notes that EXPLAIN works with INSERT, UPDATE, DELETE, and REPLACE (supported since MySQL 5.6.3).
- All SQL syntax examples are correct and would work as shown.
- The EXPLAIN output examples are realistic and internally consistent with the queries shown.
