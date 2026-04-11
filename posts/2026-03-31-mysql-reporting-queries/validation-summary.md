# Validation Summary: How to Use MySQL for Reporting Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL Window Functions (SUM OVER, LAG, RANK)
- Common Table Expressions (CTEs)
- Conditional Aggregation (CASE WHEN inside SUM)
- Covering Indexes
- EXPLAIN query plans

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — GROUP BY Handling: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — CREATE INDEX: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — DATE_FORMAT: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — LAG Function: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag

## Issues Found
No technical issues found.

## Review Notes
- The covering index in the Performance Tips section uses column order `(order_date, status, region, revenue)`. For the specific query shown (where `status = 'COMPLETED'` is an equality predicate and `order_date BETWEEN ...` is a range predicate), placing `status` before `order_date` — i.e., `(status, order_date, region, revenue)` — would allow MySQL to use the equality match first and then perform a range scan, which is generally more efficient per standard composite index design guidance. However, the current order is not incorrect and will still provide significant performance benefit, so this is an optimization nuance rather than an error.
- The `RANK()` function in the Top-N query may return more than 3 rows per region if there are ties at rank 3. If exactly 3 rows per group is required, `ROW_NUMBER()` would be the appropriate choice. The current usage is correct for the stated intent of "Top 3 products by revenue."
- The YoY comparison assumes a continuous monthly series with no gaps. If a month has no orders, `LAG(revenue, 12)` would not align to the correct prior-year month. This is a reasonable assumption for a tutorial but worth noting for production use.
