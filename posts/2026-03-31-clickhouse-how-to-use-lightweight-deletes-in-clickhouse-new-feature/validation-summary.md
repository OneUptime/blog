# Validation Summary: How to Use Lightweight Deletes in ClickHouse

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- ClickHouse (Lightweight DELETE feature)
- SQL (ClickHouse dialect)
- ClickHouse server configuration (XML profile settings)
- ClickHouse system tables (`system.mutations`, `system.query_log`, `system.parts`)

## Sources Consulted
- ClickHouse official documentation: Lightweight DELETE — https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse official documentation: ALTER TABLE DELETE — https://clickhouse.com/docs/en/sql-reference/statements/alter/delete
- ClickHouse release notes / changelog (22.8, 23.1, 23.3) — https://clickhouse.com/docs/en/whats-new/changelog
- ClickHouse documentation: OPTIMIZE TABLE — https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse documentation: system.parts, system.mutations, system.query_log tables

## Issues Found
No technical issues found.

Verified claims:
- Lightweight DELETE was introduced as experimental in ClickHouse 22.8 — correct.
- The setting `allow_experimental_lightweight_delete` is the correct name used to enable the feature on older versions — correct.
- Lightweight DELETE became production-ready / enabled by default in 23.3 — correct.
- Internal mechanism uses a `_row_exists` mask column — correct, matches ClickHouse documentation.
- MergeTree family engine requirement — correct.
- `OPTIMIZE TABLE ... FINAL` / `OPTIMIZE TABLE ... PARTITION ... FINAL` forces physical merge/cleanup — correct.
- `ALTER TABLE ... DELETE` is the heavy mutation that rewrites data parts — correct.
- System table column names (`mutation_id`, `command`, `is_done`, `parts_to_do` in `system.mutations`; `query_duration_ms`, `written_rows`, `written_bytes`, `type`, `event_time` in `system.query_log`) — correct.
- SQL syntax (`today() - 90`, `now() - INTERVAL 30 DAY`, subquery in `DELETE ... WHERE ... IN (...)`) — correct.

## Review Notes
- The claim that subquery support in `DELETE ... WHERE` was added in "ClickHouse 23.1+" is a soft version marker; subqueries in DELETE WHERE have generally been supported since lightweight deletes were introduced. Left as-is since it is not materially incorrect and does not mislead the reader.
- The statement "ClickHouse adds a hidden `_row_exists` column to the table" is a reasonable simplification. Technically, `_row_exists` is a virtual/mask column populated per part on first lightweight delete; this nuance is not essential for a how-to and the simplification is acceptable.
- The performance claim "typically 10-100x faster" is vendor-supported phrasing and a reasonable rule of thumb, though actual speedup depends on data volume and part sizes.
- `OPTIMIZE TABLE events PARTITION '202301' FINAL` uses a partition-expression form; readers using a non-string partition key may need `PARTITION ID '202301'`. This is not an error but a common caveat.
- For ReplacingMergeTree specifically, `OPTIMIZE ... FINAL CLEANUP` is an alternative for cleaning tombstones — outside the scope of this post.
