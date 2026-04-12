# Validation Summary: How to Convert Subqueries to CTEs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Common Table Expressions (CTEs)
- SQL subqueries (derived tables, scalar subqueries, correlated subqueries)

## Sources Consulted
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization — https://dev.mysql.com/doc/refman/8.0/en/derived-table-optimization.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found
- **Pattern 3 label incorrect**: The "After" label read "three named CTEs" but the query only defines two CTEs (`completed_orders` and `customer_totals`). The final SELECT is the main query, not a CTE. Fixed the label to "two named CTEs".

## Review Notes
- Pattern 4 (correlated subquery to CTE + JOIN) has a subtle semantic difference for rows with NULL join keys: the correlated subquery version retains such rows (with NULL for the computed column), while the INNER JOIN version excludes them. This is not incorrect for the purpose of demonstrating the conversion pattern, but authors may want to mention LEFT JOIN as an alternative if NULL preservation matters.
- The performance note correctly states that MySQL's optimizer can inline non-recursive CTEs via the `derived_merge` optimization (available since MySQL 8.0). The advice to use EXPLAIN is sound.
- All SQL syntax is valid MySQL 8.0.
