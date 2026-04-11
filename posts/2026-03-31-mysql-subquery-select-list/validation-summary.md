# Validation Summary: How to Use Subqueries in the SELECT List in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (scalar subqueries, correlated subqueries, SELECT list expressions)
- SQL (aggregate functions, JOIN, COALESCE, LIMIT, ORDER BY)

## Sources Consulted
- MySQL 8.0 Reference Manual — Scalar Subqueries: https://dev.mysql.com/doc/refman/8.0/en/scalar-subqueries.html
- MySQL 8.0 Reference Manual — Subqueries in the SELECT clause: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual — HAVING clause and alias references: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — Problems with Column Aliases: https://dev.mysql.com/doc/refman/8.0/en/problems-with-alias.html
- MySQL 8.0 Reference Manual — Error 1242 (Subquery returns more than 1 row): https://dev.mysql.com/doc/refman/8.0/en/subquery-errors.html

## Issues Found

1. **Misleading claim about subquery vs JOIN duplicate rows (line 69)**
   - **What was wrong:** The post stated that a SELECT-list subquery "avoids duplicate rows if the join could produce multiple matches." This implies the subquery gracefully handles multiple matches, when in fact MySQL raises error 1242 (`Subquery returns more than 1 row`) if a scalar subquery returns more than one row.
   - **What was changed:** Replaced the sentence to clarify that the pattern is equivalent to a LEFT JOIN on a unique key and that MySQL raises error 1242 if the subquery matches more than one row.
   - **Why:** Readers following this advice might expect the subquery to silently pick one row when multiple matches exist, but it will actually fail at runtime.

2. **Incorrect claim about aliases in HAVING (line 93)**
   - **What was wrong:** The post stated that SELECT-list aliases "can be used in ORDER BY but not in WHERE or HAVING." In MySQL, the HAVING clause *can* reference SELECT-list aliases — this is a documented MySQL extension to the SQL standard.
   - **What was changed:** Updated to state that aliases can be used in ORDER BY and, as a MySQL extension, in HAVING, but not in WHERE.
   - **Why:** The MySQL documentation explicitly states: "MySQL supports an extension to this behavior, and permits HAVING to refer to columns in the SELECT list." Claiming otherwise could lead readers to write unnecessarily verbose queries.

## Review Notes
- The `orders` table defined in the "Basic example" section does not include an `order_date` column, but later examples reference `o.order_date`. This is not a technical error since each example can be treated as standalone, but it could be confusing for readers who try to run all examples sequentially against the same schema.
- The COALESCE example mixes a DATE-type result (`MAX(o.order_date)`) with a string literal (`'No orders'`). This works in MySQL due to implicit type conversion but the result column type becomes VARCHAR. This is a common pattern and not incorrect, but worth noting.
- Modern MySQL (8.0+) can sometimes optimize correlated subqueries into semi-joins or materialized subqueries, so the performance caveat about "runs once for every outer row" is a simplification. The advice to use EXPLAIN is appropriate.
