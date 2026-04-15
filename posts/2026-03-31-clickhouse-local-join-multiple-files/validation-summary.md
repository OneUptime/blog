# Validation Summary: How to Join Multiple Files with clickhouse-local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-local
- SQL JOIN operations (INNER, LEFT, LEFT ANTI)
- CSV, JSON (JSONEachRow/NDJSON), Parquet file formats

## Sources Consulted
- ClickHouse `file()` table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse input/output formats documentation: https://clickhouse.com/docs/en/interfaces/formats (CSVWithNames, JSONEachRow, Parquet)
- ClickHouse JOIN clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse VALUES syntax documentation: https://clickhouse.com/docs/en/sql-reference/syntax
- clickhouse-local documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-local
- ClickHouse settings documentation (max_memory_usage): https://clickhouse.com/docs/en/operations/settings/query-complexity#max_memory_usage

## Issues Found
No technical issues found.

## Review Notes
- The command syntax `clickhouse local` (with a space) is the modern canonical form. The legacy `clickhouse-local` (hyphenated) also works as a symlink but the post correctly uses the current form.
- All JOIN types used (`JOIN`, `LEFT JOIN`, `LEFT ANTI JOIN`) are valid ClickHouse syntax. `LEFT ANTI JOIN` is a ClickHouse-specific extension not found in standard SQL.
- The `VALUES` clause used as an inline subquery with column aliasing (`AS s (code, description)`) is valid ClickHouse syntax following the SQL standard.
- The performance advice about placing the smaller table on the right side of a JOIN is correct — ClickHouse builds a hash table from the right-side table in RAM, so keeping it small reduces memory usage.
- The `--max_memory_usage` flag is a valid CLI parameter for clickhouse-local to control memory limits.
