# Validation Summary: How to Generate Random Rows from a Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SELECT, ORDER BY RAND(), LIMIT/OFFSET, UNION ALL, prepared statements, indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement (LIMIT clause): https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — UNION Clause: https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual — PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — CREATE TABLE (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found

1. **Method 1 (Random Offset) — invalid OFFSET expression**: The original query used `OFFSET FLOOR(RAND() * (SELECT COUNT(*) FROM products))` directly in the OFFSET clause. MySQL's LIMIT/OFFSET clause only accepts non-negative integer constants, prepared statement placeholders, or stored program variables — not arbitrary expressions or subqueries. This would produce a syntax error. Fixed by rewriting to use `SET @offset`, `PREPARE`, `EXECUTE`, and `DEALLOCATE PREPARE`.

2. **Method 2 fallback (UNION ALL) — syntax error and row count bug**: The UNION ALL query did not parenthesize individual SELECTs, which is required when individual SELECTs use ORDER BY or LIMIT in a UNION. Additionally, without an outer LIMIT, the query could return up to 20 rows (10 from each branch) instead of the intended 10. Fixed by adding parentheses around each SELECT and an outer `LIMIT 10` on the UNION result.

3. **Method 4 title — misleading name**: The section was titled "Reservoir Sampling with User Variables" but the query uses neither reservoir sampling (a specific streaming algorithm) nor user variables. It is a simple random ID range selection for fetching a single row. Renamed to "Single Random Row via ID Range".

4. **Method 5 title — misleading name**: The section was titled "UUID-Based Random Selection" but the technique uses a FLOAT column populated with RAND(), not UUIDs. Renamed to "Indexed Random Key Column".

## Review Notes
- The `DEFAULT (RAND())` expression default in Method 5 requires MySQL 8.0.13+. The post does not mention this version requirement. This is not incorrect but could be noted for readers on older versions.
- The JOIN-based method (Method 3) still performs ORDER BY RAND() over all rows internally; the performance benefit comes from the temporary sort table being smaller (only the id column). The explanation is correct but could be clearer about this nuance.
- The ID-range methods (Methods 2 and 4) produce a non-uniform distribution biased toward rows near the selected random point. The post acknowledges this trade-off in the summary.
