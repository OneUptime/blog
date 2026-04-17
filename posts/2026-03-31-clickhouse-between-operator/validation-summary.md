# Validation Summary: How to Use BETWEEN Operator in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (BETWEEN / NOT BETWEEN operators)
- ClickHouse primary key / sparse index
- ClickHouse partition pruning

## Sources Consulted
- ClickHouse SQL reference — Operators: https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse — Primary keys and sparse indexes: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse — MergeTree partition pruning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse — Date and DateTime functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

- `BETWEEN low AND high` being inclusive on both ends and equivalent to `>= low AND <= high` is correct per ClickHouse SQL reference.
- `NOT BETWEEN` being equivalent to `< low OR > high` is correct.
- The partition pruning advice (filtering on the partition column enables pruning) is accurate for MergeTree engines.
- The sparse primary key index behavior (granule skipping, effectiveness depending on leading key columns being filtered) is accurate.
- The `toStartOfDay` function and `count()` aggregate usage is correct.
- Integer, Float, and Date/DateTime literal comparisons with BETWEEN work as shown.

## Review Notes
- The phrasing "Place leading sort-key columns in your WHERE clause before range columns" could be misread as meaning the textual order of conditions in the WHERE clause matters — in ClickHouse the query optimizer does not care about WHERE-clause condition order, only about which columns are filtered. The intent (filter on leading key columns, not just trailing ones) is clear from the accompanying example, so no edit was made.
- The `event_time BETWEEN '2025-06-01 00:00:00' AND '2025-06-30 23:59:59'` example is fine for second-precision `DateTime`. If the column were `DateTime64` with sub-second precision, this range would technically exclude values in the last second of the day; readers using `DateTime64` may prefer `event_time >= '2025-06-01' AND event_time < '2025-07-01'`. Not a correctness issue for the example as written.
