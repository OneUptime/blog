# Validation Summary: How to Use VersionedCollapsingMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- VersionedCollapsingMergeTree table engine
- SQL (DDL + DML)

## Sources Consulted
- ClickHouse official docs: VersionedCollapsingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse official docs: CollapsingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse official docs: argMax / argMaxIf combinators — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse official docs: FINAL modifier — https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier

## Issues Found
- **Inconsistent out-of-order example.** In the "Out-of-Order Handling" section, the cancellation row used `sign=-1, version=2`, then the inserts added `sign=+1, version=1` and `sign=+1, version=2`. Because VersionedCollapsingMergeTree collapses rows sharing the same sorting key *and* version with opposite signs, the `+1/v2` and `-1/v2` rows would cancel out, leaving only `+1/v1` — contradicting the claim "only version 2 remains active." Fixed by changing the cancellation to `(1003, 'pending', 200.0, now(), -1, 1)` so it targets the old version 1 state; after merging, `+1/v1` and `-1/v1` collapse and only version 2 survives, matching the stated outcome. Comment label updated accordingly.

## Review Notes
- Engine signature `VersionedCollapsingMergeTree(sign, version)` and the required `Int8` / `UInt*` column types match the ClickHouse docs.
- The collapse rule described ("pairs with the same sorting key and matching versions" + opposite signs) is accurate per the official engine reference.
- The `argMaxIf(status, version, sign = 1)` combinator usage is valid ClickHouse SQL.
- Using `FINAL` together with `WHERE sign = 1` is the canonical recommended read pattern and correctly filters any residual cancellation-only rows (e.g., soft-deletes).
- Minor stylistic note (not fixed): the `ORDER BY (order_id)` on a single column could be written `ORDER BY order_id`, but both forms are valid and the parenthesized form is a common idiom.
- No version-pinned claims were made, so the post should remain accurate across current ClickHouse releases.
