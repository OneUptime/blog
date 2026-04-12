# Validation Summary: How to Use VARIANCE() and VAR_POP() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (aggregate statistical functions)
- VARIANCE(), VAR_POP(), VAR_SAMP()
- STDDEV_POP(), STDDEV(), STDDEV_SAMP()

## Sources Consulted
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual — VARIANCE(): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_variance
- MySQL 8.0 Reference Manual — VAR_POP(): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_var-pop
- MySQL 8.0 Reference Manual — VAR_SAMP(): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_var-samp
- MySQL 8.0 Reference Manual — Date and Time Functions (YEAR, WEEK): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is valid and all code examples are self-contained and runnable (except the time-series example which references a `daily_sales` table not created in the post, but this is clearly illustrative).
- Mathematical formulas for population and sample variance are correctly stated.
- VARIANCE() as an alias for VAR_POP() and STDDEV() as an alias for STDDEV_POP() are accurately documented per MySQL reference.
- NULL handling behavior is correctly described: aggregate functions ignore NULLs, and return NULL when applied to zero non-NULL values.
- Numeric results from the example data were manually verified (high-variance filtering, QC batch pass/fail thresholds) and are consistent with the stated logic.
- The Coefficient of Variation formula is standard and correctly applied.
