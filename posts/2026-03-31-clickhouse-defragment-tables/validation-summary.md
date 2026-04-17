# Validation Summary: How to Defragment ClickHouse Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, CollapsingMergeTree)
- ClickHouse SQL: `OPTIMIZE TABLE`, `system.parts`, `system.merges`
- `clickhouse-client` CLI
- Bash scripting and cron

## Sources Consulted
- ClickHouse OPTIMIZE statement docs: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse `system.parts` reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.merges` reference: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse MergeTree family docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found
- **Incorrect multi-partition OPTIMIZE syntax.** The example `OPTIMIZE TABLE events PARTITION ('2026-01', '2026-02', '2026-03');` was presented as a way to optimize multiple partitions in one statement. The `OPTIMIZE TABLE` grammar only accepts a single partition expression per statement; a tuple value is interpreted as a single partition whose key IS a tuple (e.g. `PARTITION BY (toYYYYMM(date), region)`), not as a list of partitions. Replaced the example with separate `OPTIMIZE TABLE ... PARTITION` statements, one per partition, and added a clarifying comment.

## Review Notes
- All `system.parts` columns referenced (`database`, `table`, `partition`, `active`, `rows`, `bytes_on_disk`) are valid.
- All `system.merges` columns referenced (`table`, `partition_id`, `elapsed`, `progress`, `num_parts`, `result_part_name`, `total_size_bytes_compressed`) are valid.
- ReplacingMergeTree/CollapsingMergeTree deduplication via `OPTIMIZE FINAL` is scoped to within a single partition (merges never combine parts across partitions) — the post's claim is correct for typical single-partition scenarios, though strictly speaking `FINAL` is not a hard guarantee in all edge cases (concurrent inserts, part-size limits). Wording left as-is since it reflects normal operational behavior.
- The `SELECT DISTINCT ... GROUP BY` combination in the defragmentation script is redundant but syntactically valid; left unchanged to avoid stylistic edits.
- `FORCE` and `DEDUPLICATE [BY expression]` clauses of `OPTIMIZE` are not covered but are out of scope for an introductory defrag guide.
