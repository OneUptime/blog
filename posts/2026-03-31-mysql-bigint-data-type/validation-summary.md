# Validation Summary: How to Use BIGINT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (BIGINT data type, integer types, InnoDB indexing)
- SQL (DDL, DML, arithmetic, type casting)

## Sources Consulted
- MySQL 8.0 Reference Manual: Integer Types — https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual: Numeric Type Attributes — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html
- MySQL 8.0 Reference Manual: Arithmetic Operators — https://dev.mysql.com/doc/refman/8.0/en/arithmetic-functions.html
- MySQL 8.0 Reference Manual: FROM_UNIXTIME() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_from-unixtime
- MySQL 8.0 Reference Manual: Server System Variables (div_precision_increment) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_div_precision_increment
- MySQL 8.0 Reference Manual: CAST and CONVERT Functions — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found

1. **FROM_UNIXTIME division operator**: Changed `occurred_at / 1000` to `occurred_at DIV 1000` in the timestamp conversion query. MySQL's `/` operator returns a DECIMAL result (with 4 fractional digits by default due to `div_precision_increment`). When FROM_UNIXTIME receives a decimal input, it returns a DATETIME with matching fractional seconds precision (e.g., `2025-03-10 00:00:00.0000`), which does not match the displayed output. Using `DIV` (integer division) returns an integer, so FROM_UNIXTIME produces a clean `2025-03-10 00:00:00` as shown.

2. **Financial amounts output incorrect decimal places**: The `amount_cents / 100` query uses MySQL's `/` operator, which returns a DECIMAL with 4 extra fractional digits (controlled by `div_precision_increment`, default 4). The output showed 2 decimal places (e.g., `1000.00`) but MySQL actually produces 4 (e.g., `1000.0000`). Updated the output table to show the correct 4 decimal places.

## Review Notes
- The syntax section shows `[(display_width)]` and `[ZEROFILL]` which were deprecated in MySQL 8.0.17 and removed in MySQL 8.4. The post does not specify a MySQL version, so this is technically valid for MySQL 8.0.x but readers on MySQL 8.4+ will get errors if they use these attributes.
- The financial amounts example could be improved by wrapping the division in `ROUND(amount_cents / 100, 2)` or `CAST(amount_cents / 100 AS DECIMAL(15,2))` to produce cleaner 2-decimal-place output suitable for currency display. The current query is correct but the 4 decimal places may surprise readers.
- The Comparing Integer Types flowchart uses signed ranges for thresholds (127, 32767, 2.1B). For primary keys, UNSIGNED types are more common, which would double these thresholds. This is not incorrect but could be noted.
