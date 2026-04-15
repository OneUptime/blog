# Validation Summary: How to Calculate Week-Over-Week Changes in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, window functions, date/time functions)
- SQL window functions (`lagInFrame`, `PARTITION BY`, `ORDER BY`)
- ClickHouse date functions (`toStartOfWeek`, `addWeeks`, `today`)
- ClickHouse null-handling functions (`ifNull`)

## Sources Consulted
- ClickHouse official documentation: `lagInFrame` window function — https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame
- ClickHouse official documentation: `lag` window function — https://clickhouse.com/docs/en/sql-reference/window-functions/lag
- ClickHouse official documentation: Window functions overview — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation: `toStartOfWeek` — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofweek
- ClickHouse official documentation: `addWeeks` — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#addweeks
- ClickHouse official documentation: `ifNull` — https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#ifnull

## Issues Found
- **Inaccurate description of `lagInFrame`**: The post described `lagInFrame` as accessing "the value from a previous row within a defined partition." The "InFrame" suffix specifically means it operates within the *window frame*, not just the partition. Changed "within a defined partition" to "within the window frame."

## Review Notes
- The post uses `lagInFrame` throughout. ClickHouse also provides a standard `lag` function which ignores frame boundaries (always uses `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`). For simple week-over-week calculations, `lag` would be equally valid and is more portable across SQL dialects. However, `lagInFrame` is not incorrect here since the default frame includes the previous row.
- `toStartOfWeek` defaults to mode 0, which starts weeks on Sunday. The post does not mention this, which could surprise users expecting Monday-based weeks. This is not an error but could be a useful note for readers.
- The pattern of using window functions directly over aggregate expressions (e.g., `lagInFrame(sum(revenue))`) alongside `GROUP BY` is valid in SQL and ClickHouse, though using a CTE to separate aggregation from window function application is generally considered cleaner.
