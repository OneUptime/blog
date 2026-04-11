# Validation Summary: How to Optimize LIMIT with Large Offsets in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB)
- SQL (LIMIT, OFFSET, keyset pagination, deferred joins)
- EXPLAIN ANALYZE (MySQL 8.0.18+)
- information_schema.TABLES
- Descending indexes (MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: LIMIT/OFFSET behavior (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual — Descending Indexes (https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html)
- MySQL 8.0 Reference Manual — Row Constructors / Row Subqueries (https://dev.mysql.com/doc/refman/8.0/en/row-subqueries.html)
- MySQL 8.0 Reference Manual — EXPLAIN ANALYZE (https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze)
- MySQL 8.0 Reference Manual — information_schema.TABLES (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- "High Performance MySQL" (O'Reilly) — deferred join and keyset pagination patterns

## Issues Found
1. **Deferred join missing ORDER BY on outer query**: The deferred join example had no `ORDER BY` on the outer SELECT. Per the SQL standard, without an explicit ORDER BY the result order is undefined — MySQL does not guarantee the subquery's ordering propagates through a JOIN. Added `ORDER BY o.id` to the outer query to ensure correct result ordering.

## Review Notes
- The `CREATE INDEX ... (col DESC)` syntax requires MySQL 8.0+. Earlier versions parse but silently ignore DESC in index definitions. The post does not specify a minimum version.
- `EXPLAIN ANALYZE` requires MySQL 8.0.18+. The post does not note this version requirement.
- Row constructor comparisons (`WHERE (created_at, id) < (...)`) are valid MySQL syntax, but the optimizer's ability to efficiently use composite indexes with row constructors has varied across MySQL versions. In some cases MySQL may not use the index optimally, falling back to a range scan on only the first column. Users should verify with EXPLAIN.
- The `TABLE_ROWS` value from `information_schema.TABLES` is an estimate for InnoDB tables (based on sampling), not an exact count. The post correctly describes it as an "approximation."
- The deferred join's benefit of scanning a "narrow index" is most pronounced when ordering by a secondary index column. When ordering by the InnoDB primary key (clustered index), the clustered index leaf pages contain all row data, so the IO savings are smaller — the benefit comes primarily from reduced column processing in the scan phase.
