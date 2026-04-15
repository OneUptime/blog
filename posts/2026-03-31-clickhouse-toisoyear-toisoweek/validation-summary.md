# Validation Summary: How to Use toISOYear() and toISOWeek() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect and built-in functions)
- ISO 8601 week numbering standard

## Sources Consulted
- ClickHouse official documentation — Date/Time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (toISOYear, toISOWeek, toYear, toMonday)
- ClickHouse official documentation — Type Conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions (toString)
- ClickHouse official documentation — String functions: https://clickhouse.com/docs/en/sql-reference/functions/string-functions (lpad/leftPad, concat)
- ClickHouse official documentation — Functions for Nulls: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls (nullIf)
- ClickHouse official documentation — Window functions: https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame (lagInFrame)
- ClickHouse official documentation — Aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq (uniq)
- ISO 8601 week date specification: https://en.wikipedia.org/wiki/ISO_week_date
- Epoch Converter week numbers for 2024: https://www.epochconverter.com/weeks/2024

## Issues Found
No technical issues found.

## Review Notes
- All ClickHouse functions used in the post (toISOYear, toISOWeek, toYear, toMonday, lagInFrame, lpad, concat, toString, nullIf, uniq, count, sum, round, today) are verified to exist and are used with correct syntax.
- The ISO 8601 definition is correctly stated: weeks start on Monday, week 1 contains the first Thursday of the year.
- All date boundary claims are verified: Dec 28, 2024 is ISO week 52 of 2024; Dec 30-31, 2024 are ISO week 1 of 2025. The expected output table is correct.
- The warning about never pairing toYear() with toISOWeek() is sound advice — these functions can disagree at year boundaries, leading to incorrect GROUP BY results.
- The lagInFrame() usage is correct; with the default frame (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), the previous row is always within the frame, so the lag works as intended.
- ClickHouse supports referencing column aliases within the same SELECT clause, so the alias-based expressions (e.g., using `iso_year` in `concat(toString(iso_year), ...)`) are valid.
