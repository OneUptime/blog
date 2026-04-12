# Validation Summary: How to Use DECIMAL Data Type in MySQL for Exact Precision

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL DECIMAL / NUMERIC / DEC data types
- MySQL exact-value numeric arithmetic
- MySQL FLOAT vs DECIMAL comparison
- MySQL strict SQL mode overflow behavior

## Sources Consulted
- MySQL 8.0 Reference Manual: Precision Math — https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual: Fixed-Point Types (Exact Value) - DECIMAL, NUMERIC — https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: Out-of-Range and Overflow Handling — https://dev.mysql.com/doc/refman/8.0/en/out-of-range-and-overflow.html
- MySQL 8.0 Reference Manual: Numeric Literals — https://dev.mysql.com/doc/refman/8.0/en/number-literals.html

## Issues Found
1. **Incorrect column spec in comment (line 127)**: The comment said `DECIMAL(10, 2) column` but the actual `subtotal` column in the `invoices` table is defined as `DECIMAL(12, 2)`. Fixed the comment to say `DECIMAL(12, 2)`.

2. **Inaccurate FLOAT comparison output (lines 135-153)**: The example used a plain `SELECT dec_val, flt_val` to display FLOAT imprecision, but MySQL would actually display the FLOAT value as `0.3` — not the long form `0.30000001192092896`. MySQL 8.0.17+ uses the shortest round-trip representation for floating-point display, and older versions used limited significant digits for FLOAT. Added `CAST(flt_val AS DECIMAL(20, 17))` to the SELECT to correctly reveal the stored imprecision, which is the standard technique for demonstrating this behavior.

## Review Notes
- The storage size explanation is simplified but correct for the `DECIMAL(10,2)` example (5 bytes). A more detailed breakdown of the leftover-digits-to-bytes mapping (1-2 digits = 1 byte, 3-4 = 2 bytes, 5-6 = 3 bytes, 7-9 = 4 bytes) could be added for completeness but is not required.
- MySQL also accepts `FIXED` as an alias for `DECIMAL`, which is not mentioned. This is not an error, just an omission of a less commonly used alias.
- The `tax_amount` in the INSERT example (13.12) is consistent with `ROUND(149.99 * 0.0875, 2) = 13.12` and the total (163.11) matches `149.99 + 13.12 = 163.11`. Verified correct.
