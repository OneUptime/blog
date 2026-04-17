# Validation Summary: How to Create a Window View in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (Window View feature, experimental)
- ClickHouse SQL DDL (`CREATE WINDOW VIEW`)
- Time window functions: `tumble`, `hop`, `tumbleStart`, `tumbleEnd`, `hopStart`, `hopEnd`
- Watermark strategies (`STRICTLY_ASCENDING`, `ASCENDING`, `BOUNDED`)
- `ALLOWED_LATENESS` late-data handling
- `MergeTree` destination tables and `WATCH` streaming
- `users.xml` profile settings / `system.tables`

## Sources Consulted
- ClickHouse Docs — CREATE VIEW (Window View section): https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse GitHub — view.md (master): https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/statements/create/view.md
- ClickHouse Docs — Time window functions: https://clickhouse.com/docs/sql-reference/functions/time-window-functions

## Issues Found

1. **Invalid WATERMARK keyword `BOUNDED_OUT_OF_ORDER`** — The post used `WATERMARK = BOUNDED_OUT_OF_ORDER(INTERVAL '30' SECOND)` and `WATERMARK = BOUNDED_OUT_OF_ORDER(INTERVAL '10' SECOND)`. ClickHouse's three watermark strategies are `STRICTLY_ASCENDING`, `ASCENDING`, and `BOUNDED`. The BOUNDED strategy is expressed by assigning an `INTERVAL` directly: `WATERMARK=INTERVAL '3' SECOND`. There is no function-call form with `BOUNDED_OUT_OF_ORDER(...)`. Both occurrences were rewritten to `WATERMARK = INTERVAL '<n>' <unit>`, and the subsection heading was changed from "BOUNDED_OUT_OF_ORDER Watermark" to "BOUNDED Watermark" with a one-line clarification.

2. **Incorrect `GROUP BY` template in the basic syntax section** — The post showed `GROUP BY windowID(time_col, TUMBLE(size)) | windowID(time_col, HOP(size, slide));`, which does not match ClickHouse. Window views use `tumble(time_attr, interval)` or `hop(time_attr, hop_interval, window_interval)` in the `GROUP BY`. (`windowID` exists as a separate function returning `UInt32` and is not wrapped around `TUMBLE(...)`/`HOP(...)`.) Updated the template to `GROUP BY tumble(time_col, INTERVAL size) | hop(time_col, hop_interval, window_interval);` and also fixed the `WATERMARK` options in the same template to list the three actual strategies and the `ALLOWED_LATENESS` form to use `INTERVAL value_unit`.

## Review Notes
- The `hop()` argument order used in the hopping-window example — `hop(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE)` producing a 5-minute window sliding every minute — matches ClickHouse's signature `hop(time_attr, hop_interval, window_interval)`. Correct as written.
- `tumbleStart(wid)` / `tumbleEnd(wid)` / `hopStart(wid)` / `hopEnd(wid)` usage against a `GROUP BY ... AS wid` alias matches the canonical window-view example in the ClickHouse docs.
- `INTERVAL '1' MINUTE` (single-quoted numeric) is the form used in the official Window View examples; unquoted `INTERVAL 1 MINUTE` is also accepted, but the quoted form was left as written.
- Window views remain explicitly experimental and are not supported in ClickHouse Cloud — the post's note about distributed-cluster support caveats and experimental status is accurate.
- The SQL to inspect window views via `system.tables WHERE engine = 'WindowView'` is correct (the engine name reported by ClickHouse for window-view objects is `WindowView`).
