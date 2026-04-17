# Validation Summary: How to Use CollapsingMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- CollapsingMergeTree table engine
- VersionedCollapsingMergeTree (referenced)
- ReplacingMergeTree (referenced in comparison)
- SQL (DDL/DML)

## Sources Consulted
- ClickHouse official docs — CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse official docs — VersionedCollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse official docs — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse SQL reference — FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from

## Issues Found
- The sentence "The engine requires that cancel rows have identical values for all columns except those that changed, and the `sign` column must be `-1`" was technically inverted. In CollapsingMergeTree, the cancel row is a copy of the **original** state row with `sign = -1`; the updated values go into a **separate** new `+1` row. The original phrasing implied the cancel row itself carries the changed values, which contradicts the actual mechanism and the example code later in the post. Rewrote the sentence to clarify that the cancel row matches the state row being cancelled, and that an update is a cancel row followed by a new state row with the updated values.

## Review Notes
- The comparison table states that ReplacingMergeTree supports deletion "Only by TTL or mutation." Since ClickHouse 23.2 (Feb 2023), ReplacingMergeTree also supports an optional `is_deleted` column for marking rows as deleted (visible with `FINAL` or when `clean_deleted_rows` runs). The post's comparison is therefore slightly dated, but this is a side-comparison rather than the focus of the post, and the core claim that CollapsingMergeTree has first-class delete semantics still holds. Left unchanged per the "only fix technical errors" scope.
- The `HAVING sum(sign) > 0` pattern is the standard ClickHouse-documented idiom for querying a CollapsingMergeTree without `FINAL`; verified against official docs.
- The deletion example and expected `net_sign` output (0 for deleted sessions, 1 for live ones) are accurate.
- The Int8 type requirement for the sign column and the `CollapsingMergeTree(sign)` engine-parameter syntax are correct.
- The guidance to use `VersionedCollapsingMergeTree` for out-of-order ingestion is consistent with official ClickHouse recommendations.
