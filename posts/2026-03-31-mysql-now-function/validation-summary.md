# Validation Summary: How to Use NOW() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (NOW() function, SYSDATE(), CURRENT_TIMESTAMP)
- SQL (date/time functions, INTERVAL arithmetic, TIMESTAMPDIFF)

## Sources Consulted
- MySQL 8.0 Reference Manual - Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_now
- MySQL 8.0 Reference Manual - SYSDATE(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_sysdate
- MySQL 8.0 Reference Manual - Automatic Initialization and Updating for TIMESTAMP and DATETIME: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html

## Issues Found

1. **"entire transaction" should be "entire statement" (line 133):** The post stated that NOW() gives a consistent timestamp for the "entire transaction." This is incorrect -- NOW() is evaluated once per statement (query), not per transaction. A transaction can contain multiple statements, each getting its own NOW() value. Changed "entire transaction" to "entire statement."

2. **NOW() + 0 numeric result missing decimal portion (line 39):** The example showed `NOW() + 0` returning `20260331142207`, but MySQL actually returns `20260331142207.000000` (a DECIMAL value with fractional zeros). Updated the example result to include `.000000`.

## Review Notes
- The stored procedure example correctly demonstrates the pattern for ensuring consistent timestamps across multiple statements within a procedure by capturing NOW() into a variable -- this is the proper workaround for transaction-level consistency that NOW() alone does not provide.
- All SQL syntax (INTERVAL arithmetic, TIMESTAMPDIFF, DEFAULT CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP, DELIMITER usage) is correct.
- The NOW() vs SYSDATE() comparison and SLEEP() demonstration accurately reflect documented MySQL behavior.
