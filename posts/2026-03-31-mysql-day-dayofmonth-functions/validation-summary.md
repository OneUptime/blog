# Validation Summary: How to Use DAY() and DAYOFMONTH() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DAY, DAYOFMONTH, DAYOFWEEK, LAST_DAY, YEAR, MONTH, CURDATE, NOW functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofmonth
- MySQL 8.0 Reference Manual: DAYOFWEEK() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofweek
- MySQL 8.0 Reference Manual: LAST_DAY() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_last-day

## Issues Found

1. **Return range stated as 1-31 instead of 0-31 (Overview)**: The overview said "Both return an integer from 1 to 31" but the function can also return 0 for dates with a zero day part (e.g., `'0000-00-00'`). The post's own Basic Usage section demonstrated this with `DAY('0000-00-00')` returning 0, contradicting the overview. Fixed to "0 to 31" with a note about zero day parts.

2. **Misleading "equivalent range form" label (Combining with YEAR() and MONTH() section)**: The direct equality comparison `WHERE invoice_date = '2024-06-15'` was labeled "The equivalent range form (index-friendly)." Two issues: (a) it's an equality comparison, not a range; (b) it's only truly equivalent to the function-based version when `invoice_date` is a DATE column — for DATETIME columns, `= '2024-06-15'` only matches `2024-06-15 00:00:00`. Fixed label to "The equivalent direct comparison (index-friendly for DATE columns)."

3. **Contradictory parenthetical in weekend query description**: The text said "Find orders on any weekend date (not by weekday but by specific recurring days)" but the query uses `DAYOFWEEK()`, which is explicitly finding records by weekday. The parenthetical contradicted itself. Fixed to "(using DAYOFWEEK rather than DAY)" to accurately describe the function choice.

4. **Summary repeated the 1-31 range error**: The closing summary said "return the day number (1-31)" — same inaccuracy as the overview. Fixed to "(0-31)."

## Review Notes
- All SQL syntax is correct and would execute properly on MySQL 5.7+/8.0+.
- The advice about preferring direct date comparisons over function-wrapped columns for indexed fields (in the Summary) is good performance guidance.
- For DATETIME columns, the true index-friendly equivalent of the YEAR/MONTH/DAY filter would be a range comparison: `WHERE invoice_date >= '2024-06-15' AND invoice_date < '2024-06-16'`. The post could mention this in a future update, but the current fix (noting "for DATE columns") is accurate.
- The `DAY('0000-00-00')` example depends on the `NO_ZERO_DATE` SQL mode setting; in strict mode with `NO_ZERO_DATE`, inserting zero dates is rejected. The example is valid for demonstration purposes but readers should be aware of SQL mode implications.
