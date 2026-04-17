# Validation Summary: How to Use CAST() and accurateCast() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL type conversion functions: `CAST()`, `accurateCast()`, `accurateCastOrNull()`
- ClickHouse data types: `Int8`, `Int32`, `Int64`, `UInt32`, `Float64`, `Nullable(T)`, `Date`, `DateTime`, `String`
- ClickHouse `MergeTree` table engine

## Sources Consulted
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse `INSERT INTO` statement documentation: https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse `Nullable` data type documentation: https://clickhouse.com/docs/sql-reference/data-types/nullable

## Issues Found
- **Complete Working Example - Non-Nullable column receiving NULL**: The original `CREATE TABLE` statement declared `age Int8`, but the subsequent `INSERT` uses `accurateCastOrNull(300, 'Int8')` which evaluates to `NULL`. ClickHouse refuses to insert `NULL` into a non-Nullable column by default (it throws an error unless `insert_null_as_default` is enabled), so the example as written would fail before returning the shown output. Changed the column definition from `age Int8` to `age Nullable(Int8)` so the insert and the documented output (`NULL`/`INVALID` status for row 3) are correct.

## Review Notes
- All other technical claims verified against current ClickHouse docs:
  - `CAST(300 AS Int8) = 44` — correct; CAST delegates to `toInt8`, which silently wraps on overflow (300 mod 256 = 44).
  - `CAST(3.99 AS Int32) = 3` — correct; ClickHouse truncates toward zero when converting floats to integers.
  - `accurateCastOrNull(200, 'Int8')` returns `NULL` — correct; 200 exceeds Int8 max (127).
  - `accurateCastOrNull(-128, 'Int8')` returns `-128` — correct; -128 is the Int8 minimum.
  - `CAST(NULL AS Nullable(Int32))` returns `NULL` — correct.
  - `accurateCast(value, 'TypeName')` syntax with the target type as a quoted string literal — correct.
- The `CAST(today() AS String)` example output (`2026-03-31`) is only valid on the post's publication date; this is a standard blog convention and was left as-is.
- Future caveat: ClickHouse may adjust default CAST overflow behavior via settings like `cast_keep_nullable` or future stricter-by-default modes; readers on very recent or customized ClickHouse clusters should verify the wrap-around behavior matches their environment.
