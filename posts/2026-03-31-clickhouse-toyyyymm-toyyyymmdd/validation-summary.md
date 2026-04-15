# Validation Summary: How to Use toYYYYMM() and toYYYYMMDD() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, date functions, partitioning)
- SQL (DDL, DML, aggregate queries)

## Sources Consulted
- ClickHouse documentation on toYYYYMM and toYYYYMMDD functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on Date and DateTime data types: https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse documentation on MergeTree partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on ALTER TABLE DROP PARTITION: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse documentation on system.parts table: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on string functions (leftPad/lpad): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
- **Incorrect storage size claim in "Compact Date Storage" section**: The post claimed that storing dates as `UInt32` using `toYYYYMM` or `toYYYYMMDD` "saves space compared to a `Date` column." This is incorrect. ClickHouse's `Date` type is stored as 2 bytes (UInt16 internally, days since epoch), while `UInt32` is 4 bytes — so the integer representation actually uses more storage. The claim was corrected to accurately describe the trade-off: `UInt32` provides a human-readable, sortable aggregation key, but uses more storage than `Date`.

## Review Notes
- All SQL syntax is correct for ClickHouse, including CREATE TABLE, ALTER TABLE DROP PARTITION, and SELECT queries.
- The `lpad` function used in the "Converting Back to a Date" section is a valid alias for ClickHouse's `leftPad` function.
- The `intDiv` and `MOD` operators used in the date reconstruction are correct.
- The partition pruning claim for `WHERE toYYYYMM(logged_at) BETWEEN ...` is accurate — ClickHouse can prune partitions when the WHERE clause matches the PARTITION BY expression.
- The post correctly notes that both functions accept `Date`, `Date32`, `DateTime`, and `DateTime64` arguments.
