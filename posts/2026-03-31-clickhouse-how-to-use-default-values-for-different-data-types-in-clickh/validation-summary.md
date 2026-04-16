# Validation Summary: How to Use Default Values for Different Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL, DDL)
- MergeTree table engine
- DEFAULT, MATERIALIZED, and ALIAS column expressions
- `system.columns` system table
- ClickHouse data types (UInt8/16/32/64, Int8/16/32/64, Float32/64, String, Date, DateTime, LowCardinality)

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table (DEFAULT / MATERIALIZED / ALIAS column expressions)
- ClickHouse docs on ALTER COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse docs on `extract()` function: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse docs on date/time functions (`toDate`, `toDateTime`, `toHour`, `toYYYYMM`, `now`)
- ClickHouse docs on conditional functions / ternary operator `? :` / `if(cond, x, y)`
- ClickHouse docs on `system.columns` (`default_kind`, `default_expression` fields)

## Issues Found
1. **`extract()` pattern missing capturing group** — The original expression `extract(url, '^[^?#]+')` relied on undocumented fallback behavior. ClickHouse's `extract()` is documented to return the first capturing group of the pattern. Changed to `extract(url, '^([^?#]+)')` so the pattern explicitly contains a capturing group, matching the documented contract.

## Review Notes
- The ternary operator `cond ? x : y` used in several MATERIALIZED/ALIAS expressions is valid ClickHouse syntax (equivalent to `if(cond, x, y)`).
- The comparison table (Stored on disk / Included in `SELECT *` / Can insert value) correctly reflects ClickHouse behavior for DEFAULT, MATERIALIZED, and ALIAS columns.
- DEFAULT expressions referencing other columns (including other DEFAULT columns) are supported by ClickHouse, which checks for reference cycles.
- `PARTITION BY` on a MATERIALIZED column (as used in the `web_requests` and `user_events` examples) is supported since MATERIALIZED columns are persisted to disk.
- The `toInt8(0)`/`toInt16(0)`/... examples for per-type defaults correctly illustrate the zero-initialized behavior of ClickHouse numeric types; `toDate(0)` → `1970-01-01` and `toDateTime(0)` → `1970-01-01 00:00:00` are accurate.
- Minor stylistic note (not fixed): the expression `(status_code >= 400) ? 1 : 0` is redundant because `status_code >= 400` already evaluates to `UInt8` 0/1 — but it remains technically correct.
