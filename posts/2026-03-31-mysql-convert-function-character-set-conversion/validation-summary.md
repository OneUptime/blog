# Validation Summary: How to Use the CONVERT() Function for Character Set Conversion in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CONVERT() function, CAST() function)
- Character set encoding (utf8, utf8mb4, ascii, latin1)
- SQL collation and comparison rules

## Sources Consulted
- MySQL 8.0 Reference Manual — Cast Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual — Character Set Conversion: https://dev.mysql.com/doc/refman/8.0/en/charset-conversion.html
- MySQL 8.0 Reference Manual — Character Set Connection: https://dev.mysql.com/doc/refman/8.0/en/charset-connection.html

## Issues Found

1. **Incorrect claim about non-ASCII character handling**: The post stated that `CONVERT(expr USING ascii)` "silently drops characters outside the ASCII range" (in both a code comment and the Limitations section). MySQL actually replaces unconvertible characters with `?` rather than dropping them. Fixed in both locations.

2. **Incorrect claim about CAST() and charset conversion**: The post stated "CAST() does not support charset conversion." This is incorrect for MySQL 8.0 and later, which supports `CAST(expr AS CHAR CHARACTER SET charset_name)`. Updated to reflect that `CONVERT(... USING ...)` is the traditional syntax while CAST gained charset support in MySQL 8.0.

## Review Notes
- All SQL syntax examples (`CONVERT ... USING`, `CONVERT(expr, type)`, `CAST ... AS`) are correct and use valid type keywords (`SIGNED INTEGER`, `DECIMAL(10,2)`, `DATE`).
- The explanation of "Illegal mix of collations" errors and the join use case is accurate.
- The note about CONVERT() on indexed columns preventing index usage is correct (standard behavior for function-wrapped columns without functional indexes).
- The post does not specify a MySQL version. The corrections bring it in line with MySQL 8.0+ behavior, which is the current primary version.
