# Validation Summary: How to Use VARIANCE() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (VARIANCE(), VAR_POP(), VAR_SAMP(), STD() aggregate and window functions)
- SQL (GROUP BY, HAVING, CASE, window functions with OVER/PARTITION BY)

## Sources Consulted
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_variance
- MySQL 8.0 Reference Manual — VAR_POP(): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_var-pop
- MySQL 8.0 Reference Manual — VAR_SAMP(): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_var-samp
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- Manual computation of variance from the sample data to verify output tables

## Issues Found
1. **Incorrect computed values for Alice Science row in the Basic Usage output table.**
   - The post listed variance_pop = 191.67, variance_samp = 287.50, std_dev = 13.84.
   - Correct values for scores (70, 95, 60) with mean 75.00: sum of squared deviations = 25 + 400 + 225 = 650; VAR_POP = 650/3 = 216.67; VAR_SAMP = 650/2 = 325.00; STD = sqrt(216.67) = 14.72.
   - Fixed the output table row and the narrative text referencing "191.67" to "216.67".

## Review Notes
- All other computed values in the output table (Alice Math, Bob Math, Bob Science) were verified correct.
- Technical claims about VARIANCE() being an alias for VAR_POP(), the N vs N-1 distinction, NULL handling, VAR_SAMP() returning NULL for single-row groups, and window function support in MySQL 8.0 are all accurate per MySQL documentation.
- The confidence interval example correctly notes it is an approximation for large samples. With only 6 data points per subject, the normal approximation is rough, but the comment already acknowledges this limitation.
- The HAVING clause using the column alias `variance` works in MySQL (MySQL allows column aliases in HAVING), though it could be confused with the VARIANCE() function name. This is a style choice, not an error.
