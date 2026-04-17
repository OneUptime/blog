# Validation Summary: How to Use async_insert and wait_for_async_insert in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse server settings: `async_insert`, `wait_for_async_insert`, `async_insert_max_data_size`, `async_insert_busy_timeout_ms`, `async_insert_stale_timeout_ms`
- ClickHouse system tables: `system.asynchronous_insert_log`, `system.parts`
- SQL

## Sources Consulted
- ClickHouse docs: `system.asynchronous_insert_log` — https://clickhouse.com/docs/en/operations/system-tables/asynchronous_insert_log
- ClickHouse source: `src/Interpreters/AsynchronousInsertLog.cpp` (authoritative column list)
- ClickHouse docs: Settings reference for async insert — https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse docs: `system.parts` — https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found
- **`entries` column does not exist in `system.asynchronous_insert_log`.** The original query selected `entries` from that log table, which would fail. `entries` is a (nested) column of `system.asynchronous_inserts` — the live queue of pending inserts — not of the historical log. Replaced `entries` with `status`, which is an actual column (values: `Ok`, `ParsingError`, `FlushError`) and is more informative for the "monitor the buffer" context. The other selected columns (`table`, `database`, `rows`, `bytes`, ordering by `event_time`) are all valid columns of `system.asynchronous_insert_log`.

## Review Notes
- Defaults are correct: `async_insert` = 0 and `wait_for_async_insert` = 1 (as of current ClickHouse versions).
- `async_insert_busy_timeout_ms` still works, though in ClickHouse 24.2+ adaptive timeouts were introduced (`async_insert_busy_timeout_min_ms` / `async_insert_busy_timeout_max_ms`). The legacy name remains supported as an alias, so the example is still valid for most users. Teams on very recent versions may prefer the adaptive settings for tuning.
- `system.parts` query is correct — `active`, `database`, `rows` are all valid columns.
- Trade-off table is accurate as a high-level summary.
- The "durability" framing for `wait_for_async_insert=1` is accurate: the client blocks until the buffer is flushed as a part, so crash recovery after ACK is guaranteed.
