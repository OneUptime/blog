# Validation Summary: How to Optimize ORDER BY Key Selection in ClickHouse

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse SQL (DDL, DML, EXPLAIN, system tables)
- ClickHouse Projections
- ClickHouse PRIMARY KEY vs ORDER BY separation

## Sources Consulted
- ClickHouse official documentation: MergeTree engine family (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse official documentation: Primary Keys and Indexes (https://clickhouse.com/docs/en/guides/best-practices/sparse-primary-indexes)
- ClickHouse official documentation: ALTER TABLE MODIFY ORDER BY (https://clickhouse.com/docs/en/sql-reference/statements/alter/order-by)
- ClickHouse official documentation: EXPLAIN statement (https://clickhouse.com/docs/en/sql-reference/statements/explain)
- ClickHouse official documentation: system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse official documentation: Projections (https://clickhouse.com/docs/en/sql-reference/statements/alter/projection)

## Issues Found

1. **Incorrect compression tradeoff claim (line 126):** The post stated that adding more columns to ORDER BY "may reduce compression for earlier columns (less clustering per-column)." This is inaccurate — adding columns to the sorting key does not affect compression of the columns already in the key, since those remain the primary sort determinant. The actual tradeoff is reduced compression for *non-key* columns, because the tighter sort order constrains how values in those columns are arranged. Fixed the wording to correctly reference non-key columns.

2. **Incorrect claim about ALTER TABLE and ORDER BY (line 172):** The post stated "You cannot change ORDER BY on an existing MergeTree table without recreation." This is factually incorrect. ClickHouse supports `ALTER TABLE ... MODIFY ORDER BY` to add new columns to the end of the sorting key. While you cannot remove columns or reorder existing ones (which does require recreation), the blanket statement was misleading. Added the ALTER TABLE approach for appending columns and clarified that recreation is only needed for fundamental key reordering.

## Review Notes
- The "Cardinality Rule" section recommends placing highest-cardinality columns first in ORDER BY. This is a valid strategy for maximizing index pruning on frequently-filtered columns, but it is a simplification. The ClickHouse community also recommends low-to-high cardinality ordering for better compression. The post's advice is contextually correct (it qualifies with "of the columns you most frequently filter on") but readers should be aware of the compression tradeoff.
- The statement "Queries that omit `region` still benefit from the `service_id` portion" (line 99) is technically true but could be misleading. When the leading ORDER BY column is omitted from a filter, ClickHouse falls back to a generic exclusion search rather than an efficient binary search, so the benefit is substantially reduced. The qualifying phrase "but only within the region-sorted data" helps, but readers may overestimate the pruning effectiveness.
- All SQL syntax (CREATE TABLE, EXPLAIN, projections, system.query_log queries) is correct and current.
- The PRIMARY KEY vs ORDER BY separation example correctly shows PRIMARY KEY as a prefix of ORDER BY, which is a ClickHouse requirement.
