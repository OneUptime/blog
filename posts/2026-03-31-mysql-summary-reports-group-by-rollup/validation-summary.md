# Validation Summary: How to Create Summary Reports with GROUP BY and ROLLUP in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (GROUP BY WITH ROLLUP, GROUPING() function)

## Sources Consulted
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (WITH ROLLUP) — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual: GROUPING() function — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_grouping
- MySQL 8.0 Reference Manual: IF() function — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_if

## Issues Found
No technical issues found.

## Review Notes
- The `GROUPING()` function requires MySQL 8.0.1 or later. The combination of `ORDER BY` with `WITH ROLLUP` requires MySQL 8.0.12 or later. The post does not specify minimum version requirements, which could be helpful for readers on older MySQL versions.
- When using `ORDER BY year, quarter` with ROLLUP, NULL values (subtotal/grand-total rows) sort before non-NULL values in ascending order by default. This means subtotal rows appear before their detail rows rather than after. The post does not make explicit claims about result ordering, so this is not an error, but readers expecting subtotals to appear after detail rows should either omit the ORDER BY (relying on ROLLUP's natural ordering) or use `ORDER BY GROUPING(expr), expr` to control placement.
- The `IF()` calls in earlier examples mix string literals (e.g., `'All Years'`) with integer expressions (e.g., `YEAR(order_date)`), which works due to MySQL's implicit type coercion. The "Filtering Out Grand Total" section correctly uses `CAST(... AS CHAR)` for explicit type consistency — a better practice that could be applied throughout.
