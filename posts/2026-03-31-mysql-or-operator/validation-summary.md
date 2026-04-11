# Validation Summary: How to Use the OR Operator in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (OR operator, WHERE clause, HAVING clause, index merge optimization)

## Sources Consulted
- MySQL 8.0 Reference Manual: Logical Operators (https://dev.mysql.com/doc/refman/8.0/en/logical-operators.html)
- MySQL 8.0 Reference Manual: Operator Precedence (https://dev.mysql.com/doc/refman/8.0/en/operator-precedence.html)
- MySQL 8.0 Reference Manual: Index Merge Optimization (https://dev.mysql.com/doc/refman/8.0/en/index-merge-optimization.html)
- MySQL 8.0 Reference Manual: GROUP BY Handling (https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html)

## Issues Found
1. **Incorrect composite index advice for OR across different columns (line 113)**: The post suggested adding a "composite index" as a solution for OR conditions across different columns (e.g., `WHERE customer_id = 42 OR status = 'pending'`). This is incorrect because a composite index (e.g., on `(customer_id, status)`) only efficiently serves queries using the leftmost prefix of the index. For OR across different columns, the correct approach is to have separate individual indexes on each column so MySQL can use the index_merge (union) optimization. Changed "composite index" to "separate indexes on each column (to enable index merge)".

## Review Notes
- The UNION rewrite example correctly uses `UNION` (which is `UNION DISTINCT`) rather than `UNION ALL`, ensuring semantic equivalence with the OR query by deduplicating rows that match both conditions.
- The claim that MySQL "often optimizes [OR and IN] identically" is accurate -- MySQL's optimizer internally rewrites multiple OR conditions on the same column into an IN list in many cases.
- The use of column aliases (`headcount`, `avg_salary`) in the HAVING clause is a MySQL-specific extension to standard SQL. This works in MySQL but would not be portable to all databases. This is acceptable for a MySQL-focused post.
