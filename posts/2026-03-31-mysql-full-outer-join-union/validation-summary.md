# Validation Summary: How to Use FULL OUTER JOIN in MySQL (Emulation with UNION)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (all versions, including 8.x)
- SQL (LEFT JOIN, RIGHT JOIN, UNION, UNION ALL)
- Anti-join pattern for FULL OUTER JOIN emulation

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — UNION Clause: https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — ORDER BY and NULL sorting: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html

## Issues Found
1. **Incorrect expected output ordering in Basic FULL OUTER JOIN Emulation example**: The query uses `ORDER BY team_a_player, team_b_player` (ascending by default). In MySQL, NULL values sort *before* non-NULL values in ascending order. The original output showed NULL rows (Eve, Frank) at the end of the result set, but they should appear at the beginning. Fixed the expected output table to show `(NULL, Eve)` and `(NULL, Frank)` as the first two rows, followed by `(Alice, NULL)`, `(Bob, Bob)`, `(Carol, Carol)`, and `(Dave, NULL)`.

## Review Notes
- The practical reconciliation example avoids the NULL ordering issue by using `COALESCE(o.sku, n.sku)` as the ORDER BY column, ensuring no NULLs appear in the sort key. This is a good pattern.
- The post correctly notes the edge case limitation that the naive UNION approach deduplicates based on full row equality, which works for simple cases but could produce incorrect results with duplicate join keys. The anti-join UNION ALL pattern is correctly recommended as the preferred approach.
- The post's coverage of the anti-join optimization (UNION ALL + WHERE left.id IS NULL) is accurate and practical advice for production use.
