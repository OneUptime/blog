# Validation Summary: How to Use Int8, Int16, Int32, Int64 Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Signed integer data types (Int8, Int16, Int32, Int64)
- MergeTree table engine
- Nullable type wrapper

## Sources Consulted
- ClickHouse official documentation on Int/UInt data types: https://clickhouse.com/docs/en/sql-reference/data-types/int-uint
- ClickHouse documentation on type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse documentation on Nullable: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on functions for working with Nullable values (ifNull): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls

## Issues Found
No technical issues found.

- Signed integer ranges are correct:
  - Int8: -128 to 127
  - Int16: -32,768 to 32,767
  - Int32: -2,147,483,648 to 2,147,483,647
  - Int64: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
- Storage sizes (1, 2, 4, 8 bytes) are correct.
- Type conversion functions `toInt8`, `toInt16`, `toInt32`, and `CAST(x, 'Int64')` syntax are valid ClickHouse.
- MergeTree `ENGINE = MergeTree()` with `ORDER BY` clause is syntactically correct.
- `Nullable(Int32)` and `ifNull(value, 0)` usage is correct.
- Aggregate functions `avg`, `min`, `max`, `sum` used with signed integers behave as described.
- The claim that Int64 covers Unix timestamps in nanoseconds is accurate (Int64 max ~9.2e18 easily covers ns-precision timestamps for centuries).

## Review Notes
- The post correctly notes that Int32 is analogous to the SQL standard `INTEGER` / `INT`. ClickHouse also supports alias names like `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, though this post sticks with the canonical ClickHouse names.
- Using `Nullable` adds a small storage and performance overhead in ClickHouse; users may prefer sentinel values when performance is critical, but that is a stylistic trade-off and not in scope here.
- The `signal_level Int8` example comment of "typically -128 to 0" is a reasonable real-world characterization for RSSI/dBm values.
