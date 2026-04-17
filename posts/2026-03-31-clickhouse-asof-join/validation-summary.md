# Validation Summary: How to Use ASOF JOIN in ClickHouse for Time-Series Data

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ASOF JOIN, LEFT ASOF JOIN)
- MergeTree table engine
- Time-series data modeling

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join (ASOF JOIN section)
- ClickHouse SQL reference for MergeTree engine and DateTime/DateTime64 types

## Issues Found
No technical issues found.

All technical claims align with the official ClickHouse documentation:
- ON clause structure (any number of equality conditions + exactly one closest-match condition) is correctly described.
- Supported inequality operators are accurately characterized (`>=` and `<=` listed as typical; ClickHouse also supports `>` and `<`).
- The right-table sort requirement (by join key and asof column) is correct, and the `MergeTree` `ORDER BY (key, time_column)` recommendation is appropriate.
- `LEFT ASOF JOIN` behavior — unmatched rows receiving NULL or default values — matches the documented behavior.
- The alias reference `t.trade_price - midpoint AS slippage` (referencing an alias defined earlier in the same SELECT list) is valid ClickHouse SQL, as ClickHouse supports forward alias resolution within the SELECT clause.
- All `CREATE TABLE` examples use valid types (`UInt32`, `UInt64`, `Float64`, `DateTime`, `DateTime64(3)`, `String`) and engine syntax.

## Review Notes
- The post mentions "typically `>=` or `<=`" for the inequality operator. While accurate, ClickHouse also supports strict `>` and `<` operators for ASOF JOIN — this could optionally be mentioned for completeness, but the current phrasing is not misleading.
- The inline comment `-- NULL if no config existed before this event` in the LEFT ASOF JOIN example is precise only when the column type is `Nullable` or when `join_use_nulls = 1` is set; otherwise the column receives the type's default (e.g., `0.0` for `Float64`). The preceding prose correctly caveats this with "NULL or default," so no change is required.
