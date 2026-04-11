# Validation Summary: How to Use UNION and UNION ALL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (UNION, UNION ALL operators)

## Sources Consulted
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found

1. **Incorrect output in "UNION with Different WHERE Clauses" example**: The expected output included Carol (salary 88000.00) as a third row, but the WHERE clause filters for `salary > 90000`. Carol's salary of 88000.00 does not satisfy this condition, so she should not appear in the result. Removed Carol's row from the output, leaving only the two Alice rows (105000.00 from 2026 and 95000.00 from 2025). Note: even though UNION (not UNION ALL) is used, these two Alice rows are not duplicates because they have different salary values.

2. **Incorrect row ordering in "UNION to Merge Different Sources" example**: The expected output showed Zach before Yara in the Contractor group, but the query specifies `ORDER BY type, person`. Since both are Contractors, the secondary sort on `person` applies: Yara (Y) sorts before Zach (Z). Corrected the output to show Yara first. Also fixed the table column-width alignment in the text output to be consistent.

## Review Notes
- The ORDER BY and LIMIT example shows Dave (88000) as the third row over Carol (88000) — both have the same salary so the tie-breaking order is non-deterministic. This is acceptable but could be noted for completeness.
- All SQL syntax is correct and follows MySQL conventions.
- The explanation of UNION vs UNION ALL semantics and performance characteristics is accurate.
- Best practices section is sound and aligns with MySQL documentation recommendations.
