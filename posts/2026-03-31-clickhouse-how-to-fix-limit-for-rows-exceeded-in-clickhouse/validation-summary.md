# Validation Summary: How to Fix 'Limit for rows exceeded' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (MergeTree family, query settings, user profiles)
- SQL (ClickHouse dialect)
- XML configuration (`users.xml` / `users.d/`)

## Sources Consulted
- ClickHouse docs — Restrictions on Query Complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse docs — MergeTree Table Engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse docs — `system.parts`: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse docs — SAMPLE clause: https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse source — ErrorCodes.cpp (code 158 = TOO_MANY_ROWS): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp

## Issues Found

1. **Incorrect list of valid `read_overflow_mode` values.** The post stated that valid overflow modes are `throw`, `break`, and `any`. Per the official docs, `read_overflow_mode` only accepts `throw` and `break`; `any` is only meaningful for `group_by_overflow_mode`. Corrected the sentence to reflect this and to point readers to where `any` actually applies.

2. **Misleading partition pruning claim in Fix 4.** The post asserted that, with `PARTITION BY toYYYYMM(timestamp)`, a query using `WHERE timestamp >= '2024-01-01'` does NOT benefit from partition pruning and only `WHERE toYYYYMM(timestamp) = 202401` does. This is incorrect: `toYYYYMM` is a monotonic function, and ClickHouse's `KeyCondition` analyzer translates range predicates on the underlying column into a partition range. Rewrote the example to show that both forms prune partitions, and replaced the negative example with a genuine case that does not prune (a predicate on a non-partition-key column).

## Review Notes
- The literal error-message string shown in the post is a concise form. Modern ClickHouse versions emit a slightly longer message that includes `(controlled by 'max_rows_to_read')`. The shorter form in the post is still recognizable and representative, so it was left unchanged.
- Error code 158 (TOO_MANY_ROWS), the listed settings (`max_rows_to_read`, `max_result_rows`, `max_bytes_to_read`, `read_overflow_mode`), `max_rows_to_read = 0` disabling the limit, the `system.parts` and `system.query_log` column names, the `SAMPLE 0.01` syntax, and the `users.d/` profile configuration are all accurate.
