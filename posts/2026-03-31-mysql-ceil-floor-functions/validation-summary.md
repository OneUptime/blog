# Validation Summary: How to Use CEIL() and FLOOR() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CEIL, CEILING, FLOOR, ROUND, DATEDIFF, CURDATE, COUNT functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_ceil
- MySQL 8.0 Reference Manual — FLOOR(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_floor
- MySQL 8.0 Reference Manual — ROUND(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual — Date and Time Functions (DATEDIFF, CURDATE): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The ROUND(4.5) comparison note says "ties round up," which is correct for the positive example shown but slightly simplified. MySQL uses "round half away from zero" for exact-value numbers, meaning ROUND(-4.5) = -5 (rounds away from zero, not "up"). This is a minor nuance that doesn't affect correctness in the context presented.
- The age calculation using `DATEDIFF(CURDATE(), birthdate) / 365.25` is a common approximation but not perfectly accurate for all edge cases (e.g., leap day birthdays). This is an acceptable approach for a tutorial and is clearly presented as a practical example.
- The statement "Both functions return an integer value" is correct in terms of the value returned, though the MySQL return type depends on the argument type (BIGINT for integer/string args, DOUBLE for floating-point args). The value is always an integer regardless of type.
