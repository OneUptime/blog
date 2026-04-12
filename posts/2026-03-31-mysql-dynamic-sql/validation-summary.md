# Validation Summary: How to Create Dynamic SQL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (prepared statements, stored procedures, user-defined variables)
- SQL dynamic query construction (PREPARE, EXECUTE, DEALLOCATE PREPARE)
- GROUP_CONCAT for pivot query generation
- SIGNAL SQLSTATE for error handling

## Sources Consulted
- MySQL 8.0 Reference Manual: PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual: EXECUTE Statement — https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual: DEALLOCATE PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/deallocate-prepare.html
- MySQL 8.0 Reference Manual: GROUP_CONCAT Function — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_group-concat
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html

## Issues Found
1. **Dynamic Column Lists example — inconsistent column reference**: The `GROUP_CONCAT` / `CONCAT` expression generated `CASE WHEN month = ...` referencing a bare `month` column, but the subquery derives month numbers using `MONTH(sale_date)`, implying no standalone `month` column exists on the `sales` table. The generated dynamic SQL would fail at runtime. Fixed to use `MONTH(sale_date)` in the CASE expression to match the subquery derivation.

## Review Notes
- The Dynamic WHERE Clause example concatenates `p_min_price` directly into the query string rather than using a `?` placeholder. This is technically safe because MySQL's `DECIMAL(10,2)` parameter type rejects non-numeric input at the stored procedure level, but it is inconsistent with the security advice given later in the post. A future revision could use a placeholder for `p_min_price` as well, tracking two conditional parameters.
- The `DISTINCT` keyword inside `GROUP_CONCAT` in the pivot example is redundant since the subquery already applies `DISTINCT`, but it is not incorrect.
- The Dynamic ORDER BY CASE pattern works correctly but may have performance implications on large result sets since MySQL cannot use indexes for the sort. This is a valid trade-off for the flexibility it provides and is not an error.
