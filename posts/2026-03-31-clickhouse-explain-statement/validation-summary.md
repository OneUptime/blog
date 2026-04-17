# Validation Summary: How to Use EXPLAIN Statement in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (EXPLAIN statement, query plans)
- SQL
- MergeTree table engine family

## Sources Consulted
- ClickHouse official documentation: EXPLAIN statement — https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse documentation: MergeTree primary keys and granules

## Issues Found
- **EXPLAIN examples showing `Parts:` and `Granules:` output were missing the required `indexes = 1` setting.** Per the official ClickHouse docs, the `indexes` setting defaults to 0 and must be enabled to include the `Indexes:` section (with PrimaryKey, Parts, and Granules counts) for `ReadFromMergeTree` nodes. Fixed in two places:
  - The "ReadFromMergeTree" section example now uses `EXPLAIN indexes = 1` and a short sentence notes the requirement before showing the output.
  - The "Practical Optimization Example" rewritten query now uses `EXPLAIN indexes = 1`, consistent with the surrounding text that references `Parts: X/Y`.

## Review Notes
- The general syntax `EXPLAIN [setting = value, ...] <query>` (with implicit `PLAN` type) used throughout is correct.
- Settings `header = 1` and `actions = 1` are valid EXPLAIN PLAN options (both default to 0), and their combination is legal.
- The claim that `toYear(session_start) = 2024` prevents primary key usage is an oversimplification — ClickHouse can sometimes reason about monotonic wrapping functions — but explicit range predicates remain the recommended, version-agnostic approach, so the advice is still sound.
- The abbreviated `Filter (WHERE) / ReadFromMergeTree (events)` example output in the "Filter Node" section omits the outer `Expression` nodes the real planner emits; this is an illustrative simplification, not a technical error.
- The `Aggregating` node description is a mild simplification: `optimize_aggregation_in_order` produces `AggregatingInOrder` in practice when sort and group keys align. This does not mislead the reader in a harmful way but could be expanded in a future revision.
- Output format specifics may vary slightly between ClickHouse versions, but the shown structures are plausible and representative.
