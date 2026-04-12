# Validation Summary: How to Use DATEDIFF() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (DATEDIFF, TIMESTAMPDIFF, COALESCE, CURDATE functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff

## Issues Found
No technical issues found.

## Review Notes
- All computed results in the post were manually verified and are correct, including the table output for the Alpha and Beta projects.
- 2026 is correctly treated as a non-leap year (February has 28 days), which is consistent with the DATEDIFF results shown (e.g., Beta allotted_days = 28).
- The distinction between DATEDIFF (days only, ignores time) and TIMESTAMPDIFF (supports multiple units) is accurately explained.
- NULL handling behavior and the COALESCE pattern are correctly described.
