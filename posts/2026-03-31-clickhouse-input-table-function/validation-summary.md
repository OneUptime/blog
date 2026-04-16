# Validation Summary: How to Use input() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (input() table function)
- ClickHouse SQL (INSERT SELECT, MergeTree, LowCardinality, MATERIALIZED columns)
- clickhouse-client CLI
- ClickHouse HTTP interface
- Data formats: CSV, CSVWithNames, TSV, JSONEachRow
- ClickHouse functions: parseDateTimeBestEffort, toStartOfHour, cityHash64, toDate, toUInt16, toUInt32, toFloat32, toFloat64, toYYYYMM, upper, lower

## Sources Consulted
- [ClickHouse input() table function documentation](https://clickhouse.com/docs/sql-reference/table-functions/input)
- [ClickHouse PR #5450 — Add table function input()](https://github.com/ClickHouse/ClickHouse/pull/5450)
- ClickHouse documentation for data types, MergeTree engine, INSERT formats, and the HTTP interface

## Issues Found
1. **Incorrect claim about JOINs with `input()`** — Under "Important Constraints", the post asserted: *"You cannot join `input()` with another table in the same query. All transformation logic must happen within the `SELECT` expressions."* This is not supported by the official ClickHouse documentation, which states `input()` "otherwise behaves like ordinary table function" — implying JOINs with other tables are permitted. The real restriction is that the data stream from `input()` is read only once (it is not buffered for rescanning). Rewrote the constraints bullet list to:
   - Reflect the two documented restrictions (INSERT SELECT only, appears only once).
   - Note that the stream is read only once and not buffered.
   - Note that `input()` otherwise behaves like an ordinary table function.
   - Clarify that the `FORMAT` clause must be specified at the end of the query (matches the docs wording: "specified in the end of query").

## Review Notes
- All SQL functions referenced (`parseDateTimeBestEffort`, `toStartOfHour`, `cityHash64`, `toDate`, `toYYYYMM`, type cast functions, `upper`/`lower`) are valid and current ClickHouse functions.
- The formats shown (`CSV`, `CSVWithNames`, `TSV`, `JSONEachRow`) are all supported input formats in ClickHouse.
- The `MergeTree` DDL examples, `LowCardinality(String)` type, `PARTITION BY toYYYYMM(...)` clause, and `MATERIALIZED` column syntax are all correct.
- The HTTP interface example uses the correct pattern (query as a URL parameter, body as `--data-binary`) against port 8123, which is the default HTTP port.
- The `clickhouse-client --query "..." < file.csv` stdin redirection pattern is correct for piping data.
- Minor style note (no change made): the post sometimes aliases columns in the outer `SELECT` even though `INSERT INTO ... SELECT` positional column binding does not require aliases; the aliases are harmless and aid readability, so they were kept as written.
