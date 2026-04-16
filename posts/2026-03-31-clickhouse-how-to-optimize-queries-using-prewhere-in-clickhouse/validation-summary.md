# Validation Summary: How to Optimize Queries Using PREWHERE in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- MergeTree table engine
- PREWHERE clause / query optimization
- `system.query_log`
- Skip indexes (bloom_filter)

## Sources Consulted
- ClickHouse official docs — PREWHERE: https://clickhouse.com/docs/sql-reference/statements/select/prewhere
- ClickHouse official docs — MergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — `optimize_move_to_prewhere` setting
- ClickHouse official docs — `system.query_log`

## Issues Found
No technical issues found. Key claims verified:
- PREWHERE is a MergeTree-family optimization that reads filter columns first and remaining columns only for rows that pass — correct.
- `optimize_move_to_prewhere` is the correct setting name to control automatic PREWHERE movement; setting it to 0 disables the heuristic — correct.
- PREWHERE and WHERE can coexist in the same query, with PREWHERE evaluated first — correct.
- `system.query_log` columns referenced (`query_id`, `read_rows`, `read_bytes`, `result_rows`, `query_duration_ms`, `event_date`, `event_time`, `type`) and the `QueryFinish` type value are all correct.
- CREATE TABLE syntax with `ENGINE = MergeTree()`, `PARTITION BY toYYYYMM(event_date)`, and `ORDER BY` is syntactically valid.
- The EXPLAIN query syntax is valid.

## Review Notes
- The "What Cannot Be Used in PREWHERE" list reflects historical restrictions; modern ClickHouse has relaxed some of them (e.g., ALIAS column support has improved in recent versions). The list is directionally accurate as guidance but readers on very recent ClickHouse versions may find some restrictions no longer apply verbatim.
- The post does not mention the interaction between `PREWHERE` and the `FINAL` modifier (controlled by `optimize_move_to_prewhere_if_final`), which can produce skewed results when the PREWHERE column is not in the ORDER BY key. This is a worthwhile future addition but not an error in the current content.
- The claim that PREWHERE evaluates after skip index pruning is consistent with ClickHouse's execution pipeline (index analysis → granule selection → PREWHERE → WHERE).
