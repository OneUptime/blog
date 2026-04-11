# Validation Summary: How to Use SHOW WARNINGS After EXPLAIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.x and 8.0)
- SQL EXPLAIN statement
- SHOW WARNINGS statement
- MySQL query optimizer

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Statement (https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- MySQL 8.0 Reference Manual: SHOW WARNINGS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-warnings.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Optimizing Subqueries with Semi-Join Transformations (https://dev.mysql.com/doc/refman/8.0/en/semijoins.html)
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation (https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html)
- MySQL 5.7 Reference Manual: EXPLAIN EXTENDED (https://dev.mysql.com/doc/refman/5.7/en/explain-extended.html)

## Issues Found
No technical issues found.

## Review Notes
- The statement "In older MySQL 5.x versions, you must use EXPLAIN EXTENDED" is a slight simplification. In MySQL 5.6 and earlier, `EXPLAIN EXTENDED` was required for the Note 1003 output. In MySQL 5.7, `EXPLAIN EXTENDED` was already deprecated and plain `EXPLAIN` began producing extended information by default. The post's generalization to "5.x" is acceptable for a tutorial audience but could be more precise.
- The `GROUP BY u.id` example with `u.name` in SELECT is valid assuming `u.id` is a primary key, due to MySQL's functional dependency detection with `ONLY_FULL_GROUP_BY` mode (default since MySQL 5.7.5). This is a reasonable assumption for a tutorial but is worth noting.
- The SEMI JOIN syntax shown in the optimizer rewrite example uses MySQL's internal representation format, which is correct — this is how MySQL displays it in the Note 1003 message, even though SEMI JOIN is not valid user-facing SQL syntax.
