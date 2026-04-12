# Validation Summary: How to Calculate Percentages in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for window function examples)
- SQL aggregation (COUNT, SUM, ROUND)
- Window functions (SUM OVER, LAG)
- Subqueries and cross joins

## Sources Consulted
- MySQL 8.0 Reference Manual: Arithmetic Operators — https://dev.mysql.com/doc/refman/8.0/en/arithmetic-functions.html
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual: Flow Control Functions (NULLIF) — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html

## Issues Found
1. **Incorrect claim about MySQL integer division with `/` operator.** The section "Avoiding Integer Division" stated that "MySQL performs integer division when both operands are integers." This is false — MySQL's `/` operator always returns a decimal result (precision controlled by `div_precision_increment`, default 4). Only the `DIV` operator performs integer division. The code comment "returns 0 or 1" was also wrong; `COUNT(*) / (SELECT COUNT(*) FROM products)` returns a decimal fraction like `0.3000`. Fixed by renaming the section to "Scaling the Result to a Percentage" and correcting the explanation to focus on the actual issue: the `/` operator returns a fraction between 0 and 1, and you need to multiply by 100 to get a percentage.

2. **Summary section repeated the incorrect integer division claim.** The closing sentence "Always use floating-point arithmetic to avoid integer division truncation" was corrected to "Always multiply by 100 to convert the ratio to a percentage."

## Review Notes
- All SQL code examples (subquery, cross join, window functions, LAG) are syntactically correct and use valid MySQL 8.0+ syntax.
- The window function examples correctly rely on default frame specifications (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW for cumulative sums).
- The NULLIF usage in the percentage change example correctly handles division by zero.
- The CROSS JOIN approach correctly includes `t.total` in the GROUP BY clause to satisfy SQL standards.
- The description mentions "conditional aggregation" but the post does not include an example of it. This is a minor metadata inconsistency, not a technical error in the content.
