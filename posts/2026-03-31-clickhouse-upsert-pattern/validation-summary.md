# Validation Summary: How to Implement UPSERT Pattern in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplacingMergeTree, CollapsingMergeTree, insert deduplication)
- SQL (DDL, DML, window functions)

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CollapsingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse FINAL modifier documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse insert_deduplicate setting documentation: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found

1. **Incorrect terminology: "primary key" vs "ORDER BY key" (line 15)**
   - **What was wrong:** The post stated ReplacingMergeTree keeps the latest version of a row with the "same primary key." In ClickHouse, deduplication in ReplacingMergeTree is determined by the `ORDER BY` columns (sorting key), not the `PRIMARY KEY`. These can differ when PRIMARY KEY is explicitly set as a subset of ORDER BY.
   - **What was changed:** Replaced "same primary key" with "same sorting key (defined by `ORDER BY`)".
   - **Why:** The ClickHouse docs explicitly state: "Uniqueness of rows is determined by the ORDER BY table section, not PRIMARY KEY."

2. **Missing query guidance for CollapsingMergeTree (Pattern 2)**
   - **What was wrong:** The post showed how to insert collapsing rows but did not explain how to query correct results before background merges occur. This is a significant omission since CollapsingMergeTree does not support the `FINAL` modifier in the same way, and pre-merge queries can return incorrect results.
   - **What was changed:** Added a note explaining that collapsing happens during background merges, along with a `GROUP BY ... HAVING sum(sign) > 0` query example for getting correct pre-merge results.
   - **Why:** The ClickHouse docs warn that "SELECT results depend strongly on the consistency of the object change history" and recommend aggregation-based queries for correct pre-merge reads.

3. **Misleading `now()` in insert_deduplicate example (Pattern 3)**
   - **What was wrong:** The example used `now()` for the timestamp column, but `now()` returns the current time at each execution. Since insert deduplication works at the block level (comparing the entire block content), two inserts executed at different times would have different `now()` values, producing different blocks that would NOT be deduplicated. The example contradicted its own claim.
   - **What was changed:** Replaced `now()` with a fixed timestamp literal `'2024-01-15 10:30:00'` so both inserts produce identical blocks. Changed the comment from "Re-inserting the same data" to "Re-inserting the same block." Added a note clarifying that deduplication is block-level.
   - **Why:** Block-level deduplication requires identical block content. Using `now()` would defeat the deduplication mechanism the example was trying to demonstrate.

## Review Notes
- The `FINAL` modifier discussion is accurate but could note in a future revision that ClickHouse also supports session-level `SET final = 1` and query-level `SETTINGS final = 1` as alternatives to the inline `FROM table FINAL` syntax.
- The `row_number()` window function alternative for reading deduplicated data is correct and is a valid performance optimization for large tables where `FINAL` can be slow.
- The `insert_deduplicate` setting is enabled by default (`= 1`) for replicated tables, so explicitly setting it is not strictly necessary but makes the intent clear.
