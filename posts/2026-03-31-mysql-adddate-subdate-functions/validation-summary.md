# Validation Summary: How to Use ADDDATE() and SUBDATE() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (ADDDATE, SUBDATE, DATE_ADD, DATE_SUB, LAST_DAY, DATE_FORMAT, CURDATE, NOW)
- SQL date arithmetic and INTERVAL syntax

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_adddate
- MySQL 8.0 Reference Manual — DATE_ADD / DATE_SUB: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-add
- MySQL 8.0 Reference Manual — Temporal Intervals: https://dev.mysql.com/doc/refman/8.0/en/expressions.html#temporal-intervals

## Issues Found
1. **Mermaid diagram missing SUBDATE with INTERVAL form**: The function comparison flowchart showed `ADDDATE` with both its integer and INTERVAL forms, but only showed `DATE_SUB` for INTERVAL subtraction — omitting that `SUBDATE(date, INTERVAL ...)` also supports the INTERVAL syntax. This made the diagram asymmetric and potentially misleading, implying SUBDATE only works with integers. Fixed by adding a `SUBDATE(date, INTERVAL ...)` node pointing to "Subtract any time unit" and relabeling `DATE_SUB` with "INTERVAL syntax only" to match the `DATE_ADD` labeling convention.

## Review Notes
- All date arithmetic results were manually verified and are correct, including edge cases like month-end clipping (March 31 + 3 months = June 30, March 31 - 1 month = Feb 28 in non-leap year 2026).
- The HOUR_MINUTE compound interval syntax is correctly demonstrated.
- NULL handling behavior is accurate per MySQL documentation.
- The claim that DATE_ADD() does not support the integer shorthand is correct.
- All supported INTERVAL units listed are valid MySQL interval units.
