# Validation Summary: How to Use ceil() and floor() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse rounding/math functions (`ceil`, `ceiling`, `floor`, `round`, `trunc`, `toInt64`)
- ClickHouse DateTime functions (`toDateTime`, `toUnixTimestamp`)
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse official documentation – Rounding Functions: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- ClickHouse official documentation – Type Conversion Functions (toDateTime, toInt64): https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official documentation – MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
- **Incorrect alias claim.** The original text stated, "Both functions also accept aliases: `ceiling()` is a synonym for `ceil()`." However, the ClickHouse documentation lists `ceiling` as an alias only for `ceil`; `floor` has no documented aliases. Changed the sentence to `\`ceil()\` also has an alias: \`ceiling()\` is a synonym.` to accurately reflect that only `ceil` has an alias.

## Review Notes
- Both functions correctly documented as accepting an optional second argument `N` with default `0`, including support for negative `N` (rounding to tens/hundreds).
- Basic examples verified: `ceil(-3.1) = -3`, `floor(-3.9) = -4`, `ceil(12.3456, 2) = 12.35`, `ceil(1234.5, -2) = 1300` all match ClickHouse semantics.
- The pagination example `ceil(total_rows / page_size)` works because `/` in ClickHouse yields `Float64` for integer operands (1053/50 = 21.06 → 22 pages).
- The hour-alignment example `toDateTime(floor(toUnixTimestamp(ts) / 3600) * 3600)` is valid; `toDateTime` accepts numeric arguments as Unix timestamps.
- The recommendation to prefer `toInt64()` or `trunc()` for truncation toward zero with signed numbers is accurate — `trunc()` (alias for `truncate()`) truncates toward zero while `floor()` rounds toward negative infinity.
- MergeTree DDL with `ORDER BY` is syntactically correct for ClickHouse.
- No version-specific caveats identified; described behavior is stable across current ClickHouse releases.
