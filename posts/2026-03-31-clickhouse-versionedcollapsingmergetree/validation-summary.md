# Validation Summary: How to Use VersionedCollapsingMergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- VersionedCollapsingMergeTree table engine
- CollapsingMergeTree table engine (comparison)
- SQL (DDL and DML)
- CDC (Change Data Capture) patterns

## Sources Consulted
- ClickHouse official documentation on VersionedCollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse official documentation on CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse documentation on MergeTree ORDER BY and PRIMARY KEY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Incorrect term "primary_key" in collapsing description (line 17):** The post stated that VersionedCollapsingMergeTree "pairs rows by `(primary_key, version)`". The collapsing logic is based on the **sorting key** (defined by ORDER BY), not the primary key. While these default to the same value, they can differ when PRIMARY KEY is explicitly specified. The post's own "How Rows Collapse" section correctly referenced "ORDER BY key values," creating an internal inconsistency. Changed `primary_key` to `sorting_key`.

2. **Incorrect terminology in monitoring section (line 223):** The post stated "The corresponding `+1` cancel has not been inserted" when explaining why `sign=-1` rows might persist. The `+1` rows are state/insert rows, not cancel rows — the `-1` rows are the cancel rows. Changed "cancel" to "state row" for accuracy.

## Review Notes
- The first aggregate query in "Computing Aggregates Over Current State" is incomplete — it groups by `category, product_id, price, in_stock` with a trailing comment "-- Outer aggregation" suggesting it needs to be wrapped, but doesn't show the outer query. The subquery approach that immediately follows is complete and correct. This is a pedagogical clarity issue rather than a technical error.
- The post's claim that FINAL is slower on large tables is historically accurate and still generally true, though recent ClickHouse versions (22.6+) have significantly optimized FINAL performance. The recommendation to prefer GROUP BY + HAVING for production queries remains sound advice.
- All SQL syntax is valid ClickHouse SQL. Table definitions, INSERT statements, and query patterns are correct.
- The comparison table between CollapsingMergeTree and VersionedCollapsingMergeTree is accurate.
- The CDC pipeline example is well-structured and demonstrates real-world usage correctly.
