# Validation Summary: How to Use COUNT(DISTINCT column) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (aggregate functions, COUNT, DISTINCT, GROUP BY, indexing)

## Sources Consulted
- MySQL 8.0 Reference Manual: Aggregate Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_count
- MySQL 8.0 Reference Manual: COUNT(DISTINCT expr) behavior with NULLs and multiple columns

## Issues Found
- **Incorrect unique_visitors count for /home in GROUP BY result table**: The result table in the "Using with GROUP BY" section showed `unique_visitors = 3` for the `/home` page. Based on the sample data (user_id 1, 2, and 1 again visiting /home), there are only 2 distinct user_ids (1 and 2). Fixed the value from 3 to 2.

## Review Notes
- The blog post examples are presented cumulatively (the NULL Handling section inserts a row that would affect later queries). The GROUP BY result table appears to reflect only the original 5 rows (total_views = 3 for /home, not 4), which is slightly inconsistent with the cumulative approach. However, since blog readers may run sections independently, this is acceptable. The critical fix was the unique_visitors count which was wrong regardless of whether the NULL row is included.
- MySQL's multi-column COUNT(DISTINCT col1, col2, ...) syntax is correctly noted as a MySQL-specific extension. This is not standard SQL and would not work in PostgreSQL or SQL Server.
- The mention of HyperLogLog-style approximate counting is valid general advice, though MySQL does not have a built-in HyperLogLog function. Users would need external tools or custom implementations for this.
