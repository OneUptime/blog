# Validation Summary: How to Use CURDATE() and CURTIME() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (date and time functions: CURDATE, CURTIME, CURRENT_DATE, CURRENT_TIME, NOW, DATE, TIME, TIMESTAMPDIFF, DATEDIFF)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — CURDATE(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_curdate
- MySQL 8.0 Reference Manual — CURTIME(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_curtime
- MySQL 8.0 Reference Manual — Fractional Seconds: https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html

## Issues Found

1. **Incorrect claim about fractional seconds support (Fractional Seconds section):** The text stated "Both functions accept an optional precision argument" but CURDATE() does not accept a precision argument — only CURTIME() does (accepting fsp values 0-6). The code example itself even noted "No precision option for CURDATE()" contradicting the introductory sentence. Fixed the text to say only CURTIME() accepts the optional fractional seconds precision argument.

2. **Misleading business hours query (Using CURTIME() for Time-Based Filtering section):** The description said "Filter records created during business hours" but the query used `WHERE CURTIME() BETWEEN '09:00:00' AND '17:00:00'`, which compares the current server time (not the record's creation time) against the range. This would return ALL rows or NO rows depending on when the query is executed, not filter by when records were created. Fixed to use `WHERE TIME(created_at) BETWEEN '09:00:00' AND '17:00:00'` to correctly filter records by their creation time.

## Review Notes
- The claim that "CURDATE() is slightly more efficient as it does not compute the full datetime" compared to DATE(NOW()) is reasonable but the performance difference is negligible in practice. Left as-is since it is not incorrect.
- All SQL syntax is correct for MySQL 5.7+ and 8.0+.
- The alias listings (CURRENT_DATE, CURRENT_DATE(), CURRENT_TIME, CURRENT_TIME()) are all accurate MySQL synonyms.
- TIMESTAMPDIFF and DATEDIFF usage is correct with proper argument ordering.
