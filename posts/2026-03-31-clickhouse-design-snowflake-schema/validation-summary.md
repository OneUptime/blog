# Validation Summary: How to Design a Snowflake Schema in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree engines)
- ClickHouse Materialized Views
- ClickHouse Dictionaries (dictGet function)
- SQL (DDL and analytical JOIN queries)
- Data warehousing concepts: snowflake schema, star schema, normalized dimension tables

## Sources Consulted
- ClickHouse official docs — Dictionary functions: https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — ReplacingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official docs — Data types (UInt*, Decimal64): https://clickhouse.com/docs/sql-reference/data-types
- ClickHouse official docs — Materialized Views: https://clickhouse.com/docs/sql-reference/statements/create/view

## Issues Found
1. **Incorrect dictionary key type in chained `dictGet` example.** The original code wrapped the inner `dictGet` result with `toUInt16(...)` when used as the key for the outer `dictGet('category_dict', ...)`. Per ClickHouse documentation, `dictGet`'s `id_expr` parameter must be `UInt64` (or a Tuple for complex-key dictionaries) for the standard flat/hashed/sparse_hashed layouts. Passing a UInt16 value would fail for these layouts. Changed `toUInt16(...)` to `toUInt64(...)`.

2. **Misleading hierarchy comments that did not match the code.** The SQL comment `-- Hierarchy: brand -> category -> sub_category` referenced a `sub_category` table that is never defined; the actual tables form a `product -> (brand, category)` relationship. Similarly, `-- Geographic hierarchy: city -> state -> country` referenced a `state` table that is not defined; the actual hierarchy is `customer -> city -> country`. Updated both comments to accurately describe the schema that follows.

## Review Notes
- The materialized view example (`flat_product_dim`) is syntactically valid, but readers should note that ClickHouse materialized views behave like insert triggers on the left-most/source table. This view will refresh when rows are inserted into `dim_product`, but updates to `dim_brand` or `dim_category` will not automatically cascade into the flattened view. For a truly refreshable flattened dimension, users may want to consider refreshable materialized views (introduced in recent ClickHouse versions) or a periodic rebuild. This is a nuance rather than a bug, and does not warrant a change to the post.
- The opening ASCII diagram uses `dim_sub_category` and `dim_region` as illustrative node names that are not implemented in later SQL. This is acceptable for a conceptual diagram, so no change was made.
- All `CREATE TABLE` DDL, numeric types (`UInt16`, `UInt32`, `UInt64`, `Decimal64(2)`), `MergeTree()` / `ReplacingMergeTree()` engines, and `ORDER BY` clauses are syntactically valid for current ClickHouse versions.
- The multi-join query and the flattened single-join query are both valid SQL and would execute correctly against the declared schema.
