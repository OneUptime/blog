# Validation Summary: How to Build Moving Window Aggregations in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (window functions: `ROWS BETWEEN`, `RANGE BETWEEN`)
- SQL window frame syntax (`avg`, `sum`, `min`, `max` over sliding windows)
- `PARTITION BY` for per-entity rolling aggregations
- `toUnixTimestamp()` for RANGE-based time windows

## Sources Consulted
- ClickHouse official documentation — Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse official documentation — Time-Series Analysis Functions: https://clickhouse.com/docs/use-cases/time-series/analysis-functions
- Altinity blog — ClickHouse Window Functions Current State of the Art: https://altinity.com/blog/clickhouse-window-functions-current-state-of-the-art

## Issues Found
1. **Inaccurate claim: "ClickHouse supports full SQL window frames"** — ClickHouse supports `ROWS` and `RANGE` frame types but does **not** support the `GROUPS` frame type or the `EXCLUDE` clause. Claiming "full" SQL window frame support is misleading. Changed to: "ClickHouse supports `ROWS` and `RANGE` window frames."

## Review Notes
- All six SQL code examples are syntactically correct and use valid ClickHouse window function syntax.
- The RANGE frame example using `toUnixTimestamp(ts)` is valid; ClickHouse RANGE offsets work with integer types. Note that ordering directly by a `DateTime` column also works since ClickHouse interprets RANGE offsets in seconds for DateTime columns, but the `toUnixTimestamp()` approach shown is explicit and correct.
- RANGE frame offsets in ClickHouse must be nonnegative 32-bit integers and do not work with `Nullable` or `Decimal` ORDER BY columns — worth noting for readers adapting these examples.
- The `INTERVAL` syntax (e.g., `INTERVAL 1 HOUR`) is not supported in RANGE frames; the integer approach shown (3600) is the correct way.
