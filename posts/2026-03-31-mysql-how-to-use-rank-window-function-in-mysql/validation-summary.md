# Validation Summary: How to Use RANK() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- RANK() window function
- DENSE_RANK() window function
- ROW_NUMBER() window function
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Window Function Restrictions — https://dev.mysql.com/doc/refman/8.0/en/window-function-restrictions.html

## Issues Found
- **Misleading invalid SQL example in "Top-N with RANK() Including Ties" section**: The first code block used `RANK()` directly in a `WHERE` clause, which is invalid in MySQL (window functions cannot appear in WHERE). While the post explained this immediately after the code block, the code itself had the comment "Top 3 performers (all ties included)" which made it look like working code. Changed the comment to "INCORRECT: window functions cannot be used in WHERE" to prevent readers from copying non-functional SQL.

## Review Notes
- All RANK() output values in comments were verified as correct (tie handling, gap behavior).
- The comparison between RANK(), DENSE_RANK(), and ROW_NUMBER() is accurate.
- The percentile banding example using RANK() with COUNT(*) OVER() is a reasonable approach, though readers should be aware that PERCENT_RANK() or CUME_DIST() may be more appropriate for true percentile calculations. This is not an error, just an alternative worth noting.
- ROW_NUMBER() output for tied values (Bob and Carol both with score 90) is non-deterministic — the assignment of row numbers 2 and 3 between them could vary. The post doesn't call this out but the example is still valid.
