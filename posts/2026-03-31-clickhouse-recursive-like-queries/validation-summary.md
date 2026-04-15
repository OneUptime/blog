# Validation Summary: How to Build Recursive-Like Queries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, dictionaries, window functions)
- SQL CTEs and recursive patterns
- ClickHouse Dictionary engine (FLAT layout, dictGet function)
- ClickHouse array functions (has)

## Sources Consulted
- [ClickHouse WITH clause documentation (recursive CTEs)](https://clickhouse.com/docs/sql-reference/statements/select/with)
- [ClickHouse 24.4 Release Blog Post (recursive CTE introduction)](https://clickhouse.com/blog/clickhouse-release-24-04)
- [ClickHouse CREATE DICTIONARY documentation](https://clickhouse.com/docs/sql-reference/statements/create/dictionary)
- [ClickHouse Dictionary Functions (dictGet)](https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions)
- [ClickHouse Dictionary Layouts (FLAT)](https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts)
- [ClickHouse Dictionary Sources (ClickHouse source)](https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/clickhouse)
- [ClickHouse Dictionary LIFETIME documentation](https://clickhouse.com/docs/sql-reference/statements/create/dictionary/lifetime)
- [GitHub PR #62074: Analyzer support recursive CTEs](https://github.com/ClickHouse/ClickHouse/pull/62074)

## Issues Found

### 1. Incorrect claim that ClickHouse does not support recursive CTEs (Major)
- **What was wrong:** The opening paragraph stated "ClickHouse does not support recursive CTEs natively as of recent versions." This has been incorrect since ClickHouse version 24.4 (April 2024), which introduced `WITH RECURSIVE` support via the new query analyzer. Since version 24.8, the analyzer is enabled by default, so recursive CTEs work out of the box.
- **What was changed:** Updated the introduction and summary to acknowledge native recursive CTE support since v24.4, while reframing the alternative patterns as performance optimizations rather than necessary workarounds.
- **Why:** The blog post is dated March 2026, nearly two years after recursive CTEs were added. The original claim was factually wrong for the post's timeframe.

### 2. Nullable mismatch in dictionary definition (Bug)
- **What was wrong:** The source table defines `parent_id Nullable(UInt32)` but the dictionary definition uses `parent_id UInt32` (non-Nullable). The CEO row has `parent_id = NULL`, which would cause an error when the dictionary tries to load a NULL into a non-Nullable UInt32 attribute.
- **What was changed:** Changed `SOURCE(CLICKHOUSE(TABLE 'org_chart'))` to `SOURCE(CLICKHOUSE(QUERY 'SELECT id, coalesce(parent_id, 0) AS parent_id FROM org_chart'))` to coalesce NULLs to 0 before loading into the dictionary.
- **Why:** Without this fix, the dictionary would fail to load or produce undefined behavior when encountering the NULL parent_id in the CEO row.

### 3. Inaccurate description of has() query result (Minor)
- **What was wrong:** The text said "Query all descendants of node 2" but `WHERE has(path, 2)` also returns node 2 itself (VP Engineering, with path `[1, 2]`), not just its descendants.
- **What was changed:** Updated text to "Query node 2 and all its descendants."
- **Why:** Accuracy of what the query actually returns.

## Review Notes
- The `numbers()` section describes the example as useful for "Fibonacci approximations" but only shows a cumulative sum, which is not Fibonacci-like. This is somewhat misleading but not technically incorrect, as the section is meant to illustrate sequence generation patterns in general.
- The self-join example is correct and demonstrates a valid depth-limited traversal pattern. The output columns show a top-down hierarchy from the root, which is a standard approach.
- All ClickHouse SQL syntax (CREATE TABLE, INSERT, MergeTree engine, window functions, array functions) is correct and current.
- The FLAT dictionary layout with UInt32 keys is valid; ClickHouse implicitly casts to UInt64 for the key lookup.
