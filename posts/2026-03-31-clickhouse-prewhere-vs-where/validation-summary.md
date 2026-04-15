# Validation Summary: How to Optimize ClickHouse Queries with PREWHERE vs WHERE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (PREWHERE clause, WHERE clause, query optimization)
- SQL (ClickHouse dialect)
- ClickHouse system tables (system.query_log)
- ClickHouse EXPLAIN statements (EXPLAIN SYNTAX)

## Sources Consulted
- ClickHouse official documentation — PREWHERE: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse official documentation — EXPLAIN statements: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation — system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation — Settings (optimize_move_to_prewhere): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse GitHub issue tracker (ALIAS column support in PREWHERE): https://github.com/ClickHouse/ClickHouse/issues

## Issues Found

### 1. Inaccurate PREWHERE limitations section
**What was wrong:** The limitations section contained several inaccurate or unsupported claims:
- "Cannot use PREWHERE with non-deterministic functions" — stated as a hard limitation, but it is actually about the automatic `optimize_move_to_prewhere` optimizer, not a restriction on manual PREWHERE usage.
- "Cannot use PREWHERE if the column is needed in multiple passes" — vague claim not supported by ClickHouse documentation.
- "Arrays and ALIAS columns cannot be in PREWHERE" — Array columns work in PREWHERE without issue. ALIAS columns are skipped by the automatic optimizer (since they are computed, not stored on disk), but the blanket prohibition is inaccurate.

**What was changed:** Rewrote the limitations to be accurate: clarified that the automatic optimizer skips non-deterministic functions and ALIAS columns, removed the unsupported "multiple passes" and array claims, and added the documented FINAL modifier caveat (which is an important real limitation the post was missing).

### 2. Incorrect EXPLAIN guidance for verifying PREWHERE
**What was wrong:** The post recommended `EXPLAIN PIPELINE` and said to "Look for `FilterTransform` stages to see where PREWHERE is applied." `FilterTransform` in pipeline output corresponds to WHERE filtering, not PREWHERE. PREWHERE is handled internally within the MergeTree reader and does not appear as a `FilterTransform` stage.

**What was changed:** Changed the example from `EXPLAIN PIPELINE` to `EXPLAIN SYNTAX`, which is the correct way to verify PREWHERE application — it shows the rewritten query with conditions moved to the PREWHERE clause. Updated the explanatory text accordingly.

## Review Notes
- The core explanation of how PREWHERE works (column-by-column reading, two-phase filtering) is accurate and well-written.
- All SQL syntax examples are valid ClickHouse SQL.
- The `system.query_log` column names (`read_bytes`, `result_rows`) were verified as correct.
- The `optimize_move_to_prewhere` setting and its default-on behavior are correctly described.
- The post does not mention the `optimize_move_to_prewhere_if_final` setting in the main body, but the limitations section now references it.
- The post could benefit from mentioning that `EXPLAIN SYNTAX` output will show conditions that were automatically moved, which helps diagnose whether the optimizer is working as expected — but this is a potential enhancement, not an error.
