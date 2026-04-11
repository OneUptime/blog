# Validation Summary: How to Use STD() and STDDEV() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (aggregate/statistical functions: STD, STDDEV, STDDEV_POP, STDDEV_SAMP)
- SQL (GROUP BY, subqueries, JOINs, aggregate expressions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Aggregate Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_std
- MySQL 8.0 Reference Manual — STDDEV_POP: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_stddev-pop
- MySQL 8.0 Reference Manual — STDDEV_SAMP: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_stddev-samp
- Standard mathematical definitions of population vs sample standard deviation (Bessel's correction)

## Issues Found
- **Incorrect computed values in the "Basic Usage" output table.** All six standard deviation values (std_pop and std_sample for each of Alice, Bob, and Carol) were wrong. The means were correct, but the standard deviations did not match what MySQL would return for the given dataset. Verified by independent calculation:
  - Carol: std_pop changed from 1677.73 to 1811.74; std_sample changed from 1876.12 to 2025.59
  - Alice: std_pop changed from 489.90 to 512.45; std_sample changed from 547.72 to 572.93
  - Bob: std_pop changed from 175.78 to 166.13; std_sample changed from 196.56 to 185.74

## Review Notes
- All SQL syntax is correct and uses valid MySQL functions.
- The explanations of population vs sample standard deviation, Bessel's correction, NULL handling, and the relationship between STD/STDDEV/STDDEV_POP are all accurate per MySQL documentation.
- The outlier detection query using z-scores and the coefficient of variation query are both sound approaches.
- The claim that STDDEV_SAMP returns NULL for a single-row group is correct (N-1 = 0 causes division by zero, yielding NULL).
- The AVG() display format in the output table shows 2 decimal places; MySQL's actual output for AVG on DECIMAL(10,2) would show more decimal places (typically 4-6), but this is a minor display simplification that doesn't affect correctness of the tutorial.
