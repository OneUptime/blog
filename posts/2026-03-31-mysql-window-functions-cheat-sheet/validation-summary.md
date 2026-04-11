# Validation Summary: MySQL Window Functions Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL 8.0+ Window Functions
- SQL (ROW_NUMBER, RANK, DENSE_RANK, NTILE, PERCENT_RANK, CUME_DIST, LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE)
- Window frame clauses (ROWS, RANGE)
- Named windows (WINDOW clause)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — Window Function Named Windows: https://dev.mysql.com/doc/refman/8.0/en/window-functions-named-windows.html

## Issues Found
No technical issues found.

## Review Notes
- The "FIRST_VALUE and LAST_VALUE" section title mentions LAST_VALUE but only demonstrates FIRST_VALUE. This is not a technical error, but a future enhancement could add a LAST_VALUE example with the important caveat that LAST_VALUE requires an explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frame to work as most users expect (the default frame ends at CURRENT ROW).
- The NTH_VALUE example correctly uses `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, which is essential — without it, NTH_VALUE would return NULL for rows before position N. This is a common pitfall handled well.
- The rolling average comment "rolling_7day_avg" assumes each row represents one day. This is technically correct for the `daily_revenue` table context but readers should note that ROWS-based frames count rows, not calendar days. The RANGE-based temporal frame (`RANGE BETWEEN INTERVAL 7 DAY PRECEDING`) shown in the Frame Clauses section is the true calendar-aware alternative.
