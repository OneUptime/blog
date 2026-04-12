# Validation Summary: How to Use NTILE() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- NTILE() window function
- PERCENT_RANK() window function
- SQL Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual - Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_ntile
- MySQL 8.0 Reference Manual - PERCENT_RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- SQL Standard (ISO/IEC 9075) NTILE semantics for remainder distribution

## Issues Found
1. **Incorrect bucket distribution example (line 48-57)**: The comment and expected output for dividing 7 rows into 3 buckets was wrong. The post claimed "buckets 1 and 2 get 3 rows, bucket 3 gets 1" with output Bucket 1: 1,2,3 / Bucket 2: 4,5,6 / Bucket 3: 7. Per MySQL's NTILE semantics, when rows don't divide evenly the *first* buckets each get one extra row. With 7 rows and 3 buckets: 7 = 3 + 2 + 2, so only bucket 1 gets 3 rows, and buckets 2 and 3 each get 2 rows. Fixed the comment and expected output to: Bucket 1: 1,2,3 / Bucket 2: 4,5 / Bucket 3: 6,7.

## Review Notes
- All SQL syntax is correct for MySQL 8.0+.
- The CASE expression using NTILE() in the Quartile Analysis section calls the window function twice (once for the column, once in the CASE). This works correctly in MySQL but could be noted as a performance consideration for very large datasets; a CTE wrapper would avoid the duplicate computation. Not a correctness issue, so left unchanged.
- The A/B testing example orders by user_id, which produces deterministic but not random group assignment. This is appropriate for reproducibility but worth noting if true randomization is desired. Left unchanged as the post doesn't claim randomness.
