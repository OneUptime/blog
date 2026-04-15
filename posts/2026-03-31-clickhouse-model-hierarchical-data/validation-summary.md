# Validation Summary: How to Model Hierarchical Data in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (dictionaries, MergeTree engine, hierarchy functions)
- SQL (DDL, DML, dictionary functions)
- Hierarchical data modeling patterns (materialized path, closure table)

## Sources Consulted
- ClickHouse Dictionary Layouts documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts
- ClickHouse Dictionary Attributes documentation (HIERARCHICAL): https://clickhouse.com/docs/sql-reference/statements/create/dictionary/attributes
- ClickHouse Dictionary Functions (dictGetHierarchy, dictIsIn): https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse CREATE DICTIONARY reference: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse Release 24.4 blog post (recursive CTE support): https://clickhouse.com/blog/clickhouse-release-24-04

## Issues Found

### Issue 1: Invalid dictionary layout `LAYOUT(HIERARCHY())`
- **What was wrong:** The `CREATE DICTIONARY` statement used `LAYOUT(HIERARCHY())`, which is not a valid ClickHouse dictionary layout. There is no `HIERARCHY` layout type.
- **What was changed:** Changed `LAYOUT(HIERARCHY())` to `LAYOUT(FLAT())` and added the `HIERARCHICAL` attribute to the `parent_id` column definition (`parent_id UInt64 HIERARCHICAL`). In ClickHouse, hierarchical relationships are declared via the `HIERARCHICAL` column attribute, not through the layout type.
- **Why:** The valid layout types are FLAT, HASHED, SPARSE_HASHED, CACHE, DIRECT, IP_TRIE, etc. The `HIERARCHICAL` keyword is an attribute applied to the parent column, enabling functions like `dictGetHierarchy` and `dictIsIn`.

### Issue 2: Incorrect claim that ClickHouse does not support recursive CTEs
- **What was wrong:** The intro and summary stated "ClickHouse offers ... alternatives to recursive CTEs" and "ClickHouse does not support recursive CTEs", implying recursive CTEs are unavailable.
- **What was changed:** Updated both the intro and summary to acknowledge that ClickHouse supports recursive CTEs since version 24.3, while noting that dictionary-based hierarchies, materialized paths, and closure tables often provide better performance at scale.
- **Why:** ClickHouse added `WITH RECURSIVE` support in version 24.3/24.4 (April 2024). By the post's date (March 2026), this feature is well-established and enabled by default via the new analyzer.

## Review Notes
- The `dictGetHierarchy` and `dictIsIn` function usage and return values are correct.
- The materialized path pattern (LIKE-based ancestor/descendant queries) is correctly implemented.
- The closure table approach is standard and correctly described.
- The `SOURCE(CLICKHOUSE(TABLE 'category_table'))` shorthand syntax works for local tables in modern ClickHouse versions.
- The flattened analytics table pattern is a sound recommendation.
