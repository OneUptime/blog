# Validation Summary: Why You Should Avoid Over-Indexing in ClickHouse

## Status
validated

## Post Type
Guide / Best Practice

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Primary (sparse) indexes
- Data skipping (secondary) indexes, including `bloom_filter`
- `EXPLAIN indexes = 1` diagnostic
- `system.query_log` system table

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree (default `index_granularity` = 8192)
- ClickHouse ALTER skipping-index docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index (confirmed `ALTER TABLE ... ADD INDEX name expression TYPE type [GRANULARITY value]` and `DROP INDEX` syntax)
- ClickHouse EXPLAIN docs: https://clickhouse.com/docs/en/sql-reference/statements/explain (confirmed `Granules: N/M` = after/before the index is applied)
- ClickHouse system.query_log docs: https://clickhouse.com/docs/en/operations/system-tables/query_log (confirmed `query_duration_ms`, `written_rows`, `written_bytes`, `type`, `event_time` columns and `QueryFinish` enum value)

## Issues Found
No technical issues found.

- The two-mechanism overview (sparse primary index + data skipping indexes) is accurate.
- `primary.idx` is the correct file name for the sparse primary index within a MergeTree data part.
- The granule size of ~8192 rows matches the default `index_granularity`.
- `ALTER TABLE events ADD INDEX idx_session session_id TYPE bloom_filter GRANULARITY 4` is syntactically correct per official ADD INDEX grammar.
- `EXPLAIN indexes = 1` interpretation ("Granules: N/M where N close to M means the index is not filtering") matches the documented after/before semantics.
- `system.query_log` columns and the `type = 'QueryFinish'` filter are valid.
- `ALTER TABLE ... DROP INDEX` syntax is correct.

## Review Notes
- The post omits that `bloom_filter` accepts an optional false-positive rate argument, e.g. `TYPE bloom_filter(0.01)`; the bare form used defaults to 0.025 and is valid, so this is not an error, just a detail the author chose not to cover.
- The "Good" example orders by `(user_id, event_time)` — whether this is optimal depends entirely on the workload; the post frames it correctly as a conditional recommendation rather than a universal rule.
- Consider mentioning `minmax`, `set`, `ngrambf_v1`, and `tokenbf_v1` as alternative skip-index types for completeness, but this is a scope/style suggestion, not a correctness issue.
