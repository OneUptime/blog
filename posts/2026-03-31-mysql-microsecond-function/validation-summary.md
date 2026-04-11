# Validation Summary: How to Use MICROSECOND() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (MICROSECOND(), TIMESTAMPDIFF(), DATETIME(6), NOW(6), CURRENT_TIMESTAMP(6))
- SQL (DDL, DML, date/time functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: MICROSECOND() function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_microsecond
- MySQL 8.0 Reference Manual: TIMESTAMPDIFF() function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual: Fractional Seconds in Time Values — https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html
- MySQL 8.0 Reference Manual: NOW() function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_now

## Issues Found

### 1. Incorrect TIMESTAMPDIFF result for /api/search (duration_us)
- **What was wrong:** The output table in the "Calculating Sub-Second Durations" section showed `duration_us` of `125000` for `/api/search`. The correct value is `1250000` (the time span from `10:00:02.500000` to `10:00:03.750000` is 1.25 seconds = 1,250,000 microseconds). A zero was missing.
- **What was changed:** Corrected `125000` to `1250000`.

### 2. Incorrect row ordering in TIMESTAMPDIFF output
- **What was wrong:** With `ORDER BY duration_us DESC`, the rows should be ordered: /api/search (1250000), /api/orders (850200), /api/users (333333), /api/health (1499). The blog had /api/health (1499) listed before /api/users (333333), which is incorrect for descending order.
- **What was changed:** Reordered the output rows to match the correct DESC sort.

### 3. Missing closing border on output table
- **What was wrong:** The output table for the TIMESTAMPDIFF query was missing its bottom border row.
- **What was changed:** Added the closing `+---...---+` border row.

### 4. Simplified duration_ms decimal formatting
- **What was wrong:** The `duration_ms` values used inconsistent and inaccurate rounding (e.g., 1.50 for what should be 1.499). MySQL's division of BIGINT by DECIMAL(5,1) produces results with more decimal places.
- **What was changed:** Updated to show 3 decimal places which more accurately reflects the mathematical result (e.g., 1.499, 333.333, 850.200, 1250.000).

## Review Notes
- The removed inline comment `-- crosses a second boundary` on the /api/search row was technically correct but was removed because SQL-style comments inside a `text` output block could be confusing. The concept is still clear from the data.
- All other code examples, SQL syntax, output tables, and technical explanations are accurate.
- The advice in the Summary section about preferring TIMESTAMPDIFF over subtracting MICROSECOND() values is sound and important.
- DATETIME(6) and CURRENT_TIMESTAMP(6) syntax is correctly documented and works in MySQL 5.6.5+.
