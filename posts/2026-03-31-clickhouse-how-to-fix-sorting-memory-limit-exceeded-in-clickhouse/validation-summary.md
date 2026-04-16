# Validation Summary: How to Fix 'Sorting memory limit exceeded' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse system tables (`system.query_log`, `system.metrics`, `system.metric_log`)
- ClickHouse settings (`max_bytes_before_external_sort`)
- ClickHouse projections
- SQL (ORDER BY, GROUP BY, LIMIT, CTEs)

## Sources Consulted
- ClickHouse system.query_log docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.metric_log docs: https://clickhouse.com/docs/en/operations/system-tables/metric_log
- ClickHouse query complexity settings (external sort): https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse ORDER BY reference: https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse projections (ALTER TABLE ... ADD/MATERIALIZE PROJECTION): https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse source (`src/Interpreters/QueryLog.cpp`) for column schema verification

## Issues Found
1. **Non-existent `peak_memory_usage` column in `system.query_log`.** The canonical column for peak query memory consumption in ClickHouse is `memory_usage` (UInt64), not `peak_memory_usage`. Changed both references in the diagnosing query to `memory_usage`.
2. **Incorrect filter on `system.query_log.exception`.** The original filter `exception LIKE '%Sort%memory%'` would not match real ClickHouse errors, which use the `MEMORY_LIMIT_EXCEEDED` error code with generic "Memory limit (for query) exceeded" text. Updated to `exception LIKE '%MEMORY_LIMIT_EXCEEDED%'` so the query actually returns the intended rows.
3. **Incorrect `system.metric_log` schema assumption.** The default `system.metric_log` is a wide table (one column per metric, e.g., `CurrentMetric_MemoryTracking`), not a narrow `(metric, value)` table. The original query `WHERE metric = 'MemoryTracking'` would fail. Rewrote the query to select the `CurrentMetric_MemoryTracking` column directly.

## Review Notes
- The title's specific error string "Sorting memory limit exceeded" is not a literal ClickHouse error message — ClickHouse emits the generic `MEMORY_LIMIT_EXCEEDED` error regardless of whether the memory was consumed by sorting, hashing, or other operations. The post's teaching content is still accurate for the class of memory-pressure errors that arise from heavy ORDER BY work, so the title was left unchanged.
- `max_bytes_before_external_sort` is valid and correctly explained. A companion setting `max_bytes_ratio_before_external_sort` exists in recent ClickHouse versions if users prefer a ratio-based threshold.
- The projection example uses `SELECT *` inside the projection body, which is valid but uncommon in real-world use (explicit column lists are more typical). Left as-is since it is syntactically correct.
- ORDER BY + LIMIT partial sort behavior is accurate at the behavioral level (ClickHouse applies a top-K / heap-based optimization via `PartialSortingTransform`).
- Including a `Float64` column (`revenue`) in the MergeTree `ORDER BY` key is technically allowed but rarely advisable for high-cardinality floats; this is a style/design consideration, not a correctness issue.
