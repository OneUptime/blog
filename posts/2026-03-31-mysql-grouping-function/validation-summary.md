# Validation Summary: How to Use GROUPING() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0.1+)
- SQL GROUPING() function
- GROUP BY WITH ROLLUP
- GROUPING SETS (mentioned, but not available in all MySQL versions)

## Sources Consulted
- MySQL 8.0 Reference Manual: GROUP BY Modifiers — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual: Miscellaneous Functions (GROUPING) — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_grouping
- MySQL 8.0 Reference Manual: SELECT Syntax — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found

### 1. GROUPING() bitmask CASE labels and output values were swapped (fixed)
**What was wrong:** In the "GROUPING() Bitmask with Multiple Arguments" section, the CASE expression mapped bitmask value 2 to 'Region Subtotal' and value 1 to 'Product Subtotal'. This is backwards. With `GROUPING(region, product)`, bit 1 (value 2) represents region and bit 0 (value 1) represents product. With `GROUP BY region, product WITH ROLLUP`, ROLLUP rolls up from right to left — so product is rolled up first, producing per-region subtotals with bitmask = 1 (only product is super-aggregate), not 2.

**What was changed:**
- Swapped the CASE labels: `WHEN 1 THEN 'Region Subtotal'` and `WHEN 2 THEN 'Product Subtotal'`
- Corrected the example output table: region subtotal rows now show `grp_bitmask = 1` (was incorrectly showing 2)

**Why:** `GROUP BY region, product WITH ROLLUP` generates grouping sets `(region, product)`, `(region)`, and `()`. The per-region subtotals (where product is rolled up) have `GROUPING(region)=0, GROUPING(product)=1`, so `GROUPING(region, product) = 0*2 + 1*1 = 1`, not 2.

## Review Notes
- **GROUPING SETS availability:** The post references `GROUPING SETS` throughout (intro, syntax section, a dedicated example section, and summary). As of MySQL 8.0 and 8.4, MySQL does NOT support `GROUPING SETS` — only `WITH ROLLUP` is available as a GROUP BY modifier. The GROUPING SETS example notably lacks sample output, unlike all other examples. If this post targets a future MySQL version that adds GROUPING SETS support, this should be clarified; otherwise readers on MySQL 8.x will encounter syntax errors.
- **MySQL version requirement:** The GROUPING() function requires MySQL 8.0.1 or later. The post does not mention this version requirement, which could cause confusion for readers on older MySQL versions.
- **All other examples verified correct:** The table creation, data insertion, ROLLUP queries, GROUPING() single-argument usage, CASE expressions, HAVING filter, and the bitmask reference table are all technically accurate.
