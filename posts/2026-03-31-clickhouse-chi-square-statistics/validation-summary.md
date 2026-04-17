# Validation Summary: How to Calculate Chi-Square Statistics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL)
- Chi-Square test of independence
- Statistical hypothesis testing (Z-Test, T-Test comparisons)
- A/B testing analytics

## Sources Consulted
- ClickHouse SQL reference — WITH clause / CTEs: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse aggregate functions — `countIf`, `sum`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/countif
- ClickHouse `studentTTest` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/studentttest
- ClickHouse `proportionsZTest` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/proportionsztest
- Standard chi-square critical value table (df=1..3 at p=0.10, 0.05, 0.01)
- Chi-square test of independence formula: χ² = Σ (O − E)² / E, with E(i,j) = (row_total × col_total) / grand_total

## Issues Found
No technical issues found.

- The chi-square formula `sum((observed - expected)^2 / expected)` is stated correctly.
- The expected frequency derivation `Expected = (row_total × col_total) / grand_total` as implemented in the CTE query is correct.
- Multi-CTE `WITH ... AS (subquery)` syntax and `CROSS JOIN` against scalar CTE tables are valid ClickHouse SQL.
- Critical values in the table match the standard chi-square distribution:
  - df=1: 2.706 / 3.841 / 6.635 ✓
  - df=2: 4.605 / 5.991 / 9.210 ✓
  - df=3: 6.251 / 7.815 / 11.345 ✓
- The 3.841 threshold at df=1 (95% confidence) for the 2-variant traffic balance check is correct (df = k−1 = 1 for 2 variants).
- The referenced ClickHouse functions `proportionsZTest` and `studentTTest` are real and current.

## Review Notes
- The manual chi-square CTE query assumes a 2-column contingency table (converted / not_converted). If a reader extends this to more columns, they would need to add additional `pow(...) / ...` terms per column.
- The traffic balance query divides by `2.0` and assumes exactly two variants; this is consistent with the stated df=1 threshold, but readers should generalize the divisor and df for k variants.
- Neither query guards against division-by-zero if an expected frequency is 0 (empty category); in practice this is rare but worth noting.
- No version-specific caveats — the syntax and functions used have been stable in ClickHouse for several years.
