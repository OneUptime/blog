# Validation Summary: How to Use LAST_DAY() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (Date and Time Functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_last-day
- MySQL 8.0 Reference Manual: DATE_FORMAT() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual: DATE_ADD() / DATE_SUB() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-add
- MySQL 8.0 Reference Manual: DATEDIFF() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff
- MySQL 8.0 Reference Manual: SQL Mode (NO_ZERO_IN_DATE) — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html

## Issues Found
No technical issues found.

## Review Notes
- `DATE_FORMAT(CURDATE(), '%Y-%m-01')` returns a VARCHAR, not a DATE. MySQL implicitly converts it in date comparison contexts, so the queries work correctly, but readers should be aware of the implicit cast. This is a very common MySQL pattern and not an error.
- The invalid date examples (month 0, month 13) correctly return NULL under strict SQL mode, which is the default in MySQL 5.7+. With permissive SQL modes the behavior could differ, but the post's examples reflect standard/modern MySQL behavior.
- All leap year logic is correct: 2024 is a leap year (divisible by 4, not a century year), 2026 is not (not divisible by 4).
- All 31-day and 30-day month groupings in the Mermaid flowchart are accurate.
