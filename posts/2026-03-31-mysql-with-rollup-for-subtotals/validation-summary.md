# Validation Summary: How to Use WITH ROLLUP for Subtotals in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL GROUP BY WITH ROLLUP modifier
- GROUPING() function
- COALESCE for NULL replacement in rollup rows

## Sources Consulted
- MySQL 8.0 Reference Manual — GROUP BY Modifiers: https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual — Miscellaneous Functions (GROUPING): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_grouping

## Issues Found
No technical issues found.

## Review Notes
- The post uses `COALESCE` in early examples to replace ROLLUP NULLs with labels, then progresses to `GROUPING()` for more robust detection. This is a good teaching progression. Worth noting that `COALESCE` cannot distinguish between ROLLUP-generated NULLs and genuine data NULLs — the post implicitly addresses this by introducing `GROUPING()` as the preferred approach in later sections.
- `ORDER BY` with `WITH ROLLUP` requires MySQL 8.0.12 or later. Prior versions did not allow this combination. Since MySQL 8.0.12 was released in July 2018 and 8.0 is the current mainstream version, this is unlikely to affect readers but is a minor version caveat.
- In the Two-Level Subtotals example, `COALESCE(status, 'Region Total')` labels both region subtotal rows and the grand total row identically for the status column. Using `GROUPING()` (as shown in later sections) would allow distinct labels. This is a labeling nuance rather than a technical error.
- `GROUPING()` with expressions like `YEAR(o.order_date)` in the Styling Subtotal Rows section is valid when the same expression appears in the GROUP BY clause — this is correct usage.
