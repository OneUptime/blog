# Validation Summary: How to Use DATE_FORMAT() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL DATE_FORMAT() function
- MySQL date/time format specifiers
- MySQL lc_time_names locale variable
- SQL GROUP BY with formatted dates

## Sources Consulted
- MySQL 8.0 Reference Manual: DATE_FORMAT() function (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format)
- MySQL 8.0 Reference Manual: Date and Time Function format specifiers (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format)
- MySQL 8.0 Reference Manual: lc_time_names system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lc_time_names)
- Calendar verification for June 15, 2024 (confirmed Saturday)

## Issues Found
1. **Spanish locale output missing accent mark**: The locale-aware formatting example showed `sabado` for Saturday in Spanish, but MySQL's `es_ES` locale returns `sábado` (with an accent on the first "a"). Fixed the comment to show the correct accented output: `sábado, 15 de junio de 2024`.

## Review Notes
- All 17 format specifiers in the table are correct and match MySQL documentation.
- The day-of-week claim (Saturday for 2024-06-15) was verified by calendar calculation.
- The performance advice about avoiding DATE_FORMAT() in WHERE clauses is accurate — wrapping an indexed column in a function prevents index usage.
- The `%x` and `%v` specifiers for ISO year/week are correctly described.
- The summary mentions `%M` (full month name) alongside `%H` (hour), which could potentially confuse readers familiar with other date formatting systems where uppercase M means minutes. However, the specifier table clearly defines `%M` and `%i`, so this is not an error.
