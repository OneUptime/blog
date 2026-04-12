# Validation Summary: How to Calculate Cumulative Distribution in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions, CTEs)
- CUME_DIST() window function
- PERCENT_RANK() window function
- Common Table Expressions (WITH ... AS)

## Sources Consulted
- MySQL 8.0 Reference Manual: CUME_DIST() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_cume-dist
- MySQL 8.0 Reference Manual: PERCENT_RANK() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found
1. **CUME_DIST() return value range**: The post stated `CUME_DIST()` returns a value "between 0 and 1". Per MySQL documentation, the return value range is (0, 1] — it is never 0 because the current row is always included in the count. The smallest possible value is 1/N (where N is the total number of rows). Fixed the description to accurately state the range is (0, 1] and explain why it is never 0.

## Review Notes
- All SQL examples use MySQL 8.0+ features (window functions, CTEs). The post does not explicitly state a MySQL version requirement. Readers on MySQL 5.7 or earlier will not be able to use these features.
- The PERCENT_RANK formula `(rank - 1) / (n - 1)` is correctly described. Worth noting that for a single-row partition, MySQL returns 0 for PERCENT_RANK (avoiding division by zero).
- The percentile-finding approach using `WHERE cdf_val <= 0.75` with `MAX()` is correct and practical, though for very large datasets a different approach might be more efficient.
