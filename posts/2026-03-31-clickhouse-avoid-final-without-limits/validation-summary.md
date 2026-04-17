# Validation Summary: Why You Should Avoid Using FINAL Without Limits in ClickHouse

## Status
validated

## Post Type
Guide / Best-practices article

## Technologies Covered
- ClickHouse (SQL query engine)
- ReplacingMergeTree / CollapsingMergeTree table engines
- FINAL query modifier
- `argMax` aggregate function
- `OPTIMIZE TABLE ... FINAL` DDL
- `system.parts` system table

## Sources Consulted
- ClickHouse official docs — SELECT ... FINAL: https://clickhouse.com/docs/sql-reference/statements/select/from#final-modifier
- ClickHouse official docs — ReplacingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official docs — CollapsingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse official docs — OPTIMIZE statement: https://clickhouse.com/docs/sql-reference/statements/optimize
- ClickHouse official docs — argMax: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse official docs — system.parts: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse docs — partition expressions and IDs: https://clickhouse.com/docs/sql-reference/statements/alter/partition

## Issues Found
1. **FINAL execution order oversimplified.** The original text stated FINAL "reads all parts, sorts and merges, then applies your WHERE/GROUP BY filters." Since ClickHouse 20.5+ (and improved further with `split_parts_ranges_into_intersecting_and_non_intersecting_final` in newer versions), partition pruning and primary-key predicate pushdown happen *before* the merge; only predicates on non-key columns are evaluated post-merge. Rewrote the three-step list to reflect this accurately while preserving the broader point that FINAL remains expensive on full scans.

2. **`OPTIMIZE TABLE ... PARTITION '202603'` used a string literal** for a `toYYYYMM` partition key whose native type is `UInt32`. While implicit conversion may accept it in some versions, the documented canonical forms are `PARTITION 202603` (numeric expression) or `PARTITION ID '202603'` (explicit partition ID). Changed to `PARTITION 202603` to match the numeric partition key.

## Review Notes
- The post could optionally mention the `do_not_merge_across_partitions_select_final` setting, which avoids cross-partition merges when dedup keys do not span partitions — a widely applicable FINAL optimization.
- `max_final_threads` controls FINAL parallelism and is another lever worth noting for performance-sensitive FINAL queries.
- The note about ReplacingMergeTree dedup being *eventual* is implicit in the "merges run in background" framing, but readers should also be aware that duplicate rows within the same INSERT/part are not deduplicated by ReplacingMergeTree (only across parts).
- The `argMax` alternative pattern is correct and widely recommended, but relies on the user's schema keeping an `updated_at`-style version column — worth surfacing as an assumption when adapting to other schemas.
