# Validation Summary: How to Use clickhouse-local for Local File Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-local (standalone CLI tool)
- CSV, JSON Lines (JSONEachRow), Parquet file formats
- ClickHouse SQL (file() table function, JOINs, aggregations, format conversion)
- ClickHouse date/time functions (toDate, toUnixTimestamp, parseDateTime)

## Sources Consulted
- ClickHouse official documentation for clickhouse-local: https://clickhouse.com/docs/operations/utilities/clickhouse-local
- ClickHouse `file()` table function docs: https://clickhouse.com/docs/sql-reference/table-functions/file
- ClickHouse `INTO OUTFILE` clause docs: https://clickhouse.com/docs/sql-reference/statements/select/into-outfile
- ClickHouse type conversion functions (parseDateTime): https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse formatDateTime/parseDateTime format specifiers: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse installation docs: https://clickhouse.com/docs/install

## Issues Found
No technical issues found.

## Review Notes
- The memory limits example uses `'action String, ...'` as a placeholder schema with a literal ellipsis. This is a common documentation convention and not a runnable example as-is, but readers should understand they need to replace `...` with actual column definitions.
- The installation section shows `./clickhouse local` (two words) while subsequent examples use `clickhouse-local` (hyphenated). Both forms are valid — the former runs the downloaded binary directly, while the latter assumes an installed/symlinked binary on PATH. This is consistent with official ClickHouse documentation patterns.
- The `parseDateTime` format string `'%Y-%m-%dT%H:%i:%s'` correctly uses MySQL-style specifiers (`%i` for minutes, `%s` for seconds), which are the specifiers used by ClickHouse's `parseDateTime` function.
- All SQL syntax (file() table function, DESCRIBE TABLE, JOINs across files, INTO OUTFILE, FORMAT clauses) is valid ClickHouse SQL.
- The stdin example correctly uses `table` as the default table name and `--input-format`/`--structure` as CLI flags, matching official documentation.
