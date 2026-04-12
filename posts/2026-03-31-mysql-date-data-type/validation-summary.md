# Validation Summary: How to Use DATE Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (DATE data type, date functions, indexing)
- SQL (DDL, DML, queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: The DATE, DATETIME, and TIMESTAMP Types — https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: DATE_FORMAT format specifiers — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format

## Issues Found
- **DATETIME storage size incorrect**: The comparison table listed DATETIME as 8 bytes. Since MySQL 5.6.4+, DATETIME uses 5 bytes (plus 0-3 additional bytes for fractional seconds). The 8-byte figure is from the pre-5.6.4 storage format, which is no longer relevant as all supported MySQL versions use the newer format. Changed from 8 to 5.

## Review Notes
- All SQL syntax is correct and would execute without errors.
- The DATE_FORMAT output comment ("Sunday, March 1, 2020") is verified correct — March 1, 2020 was indeed a Sunday.
- All date functions referenced (CURDATE, CURRENT_DATE, DATE_ADD, DATEDIFF, DATE_FORMAT, YEAR, MONTH, DAY, DAYNAME, WEEK) are current and non-deprecated in MySQL 8.0+.
- The advice about avoiding functions on indexed columns in WHERE clauses is correct and a valuable best practice.
- The TIMESTAMP upper range is listed as `2038-01-19` which is a reasonable simplification of the full `2038-01-19 03:14:07 UTC` limit.
