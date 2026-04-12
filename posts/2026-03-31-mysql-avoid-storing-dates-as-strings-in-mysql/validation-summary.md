# Validation Summary: How to Avoid Storing Dates as Strings in MySQL

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- MySQL (DATE, DATETIME, TIMESTAMP column types)
- SQL (STR_TO_DATE, DATEDIFF, CONVERT_TZ, UTC_TIMESTAMP functions)
- Python (datetime.strptime for application-layer date validation)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Data Types: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-types.html
- MySQL 8.0 Reference Manual — STR_TO_DATE: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_str-to-date
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — CONVERT_TZ: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual — The TIMESTAMP Type: https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- Python docs — datetime.strptime: https://docs.python.org/3/library/datetime.html#datetime.datetime.strptime

## Issues Found
1. **Migration Step 4 referenced a non-existent column and had an invalid rename.** The migration script's Step 4 used `DROP COLUMN event_date_old`, but no column was ever renamed to `event_date_old` — the original string column was still named `event_date`. Additionally, `CHANGE COLUMN event_date_new event_date` would fail with a duplicate column error because the original `event_date` column still existed. Fixed by changing Step 4 to first `DROP COLUMN event_date` (the old string column), then `CHANGE COLUMN event_date_new event_date DATE NOT NULL` in a single ALTER TABLE statement.

## Review Notes
- The `CONVERT_TZ` function requires MySQL timezone tables to be loaded (`mysql_tzinfo_to_sql`). The post doesn't mention this prerequisite, but this is a minor omission rather than an error.
- The TIMESTAMP upper bound is stated as `2038-01-19`, which is accurate (the exact limit is `2038-01-19 03:14:07 UTC`). This remains true for all current MySQL versions including 8.x.
- The Python code uses `raw_input` as a variable name. While this shadows a Python 2 builtin, the code uses f-strings (Python 3.6+), so `raw_input` is just a regular variable name — technically fine but could be mildly confusing to readers.
- All SQL syntax, function signatures, and date format specifiers are correct.
