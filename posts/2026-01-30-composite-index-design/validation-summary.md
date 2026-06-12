# Validation Summary: How to Build Composite Index Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SQL
- Composite indexes
- B-tree indexes
- PostgreSQL
- SQL Server
- MySQL

## Sources Consulted
- PostgreSQL Documentation: Multicolumn Indexes - https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL Documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL Documentation: Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL Documentation: Indexes and ORDER BY - https://www.postgresql.org/docs/current/indexes-ordering.html
- MySQL Reference Manual: Multiple-Column Indexes - https://dev.mysql.com/doc/refman/9.7/en/multiple-column-indexes.html
- MySQL Reference Manual: How MySQL Uses Indexes - https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html
- MySQL Reference Manual: Range Optimization - https://dev.mysql.com/doc/refman/9.7/en/range-optimization.html
- Microsoft Learn: Create indexes with included columns - https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-indexes-with-included-columns
- Microsoft Learn: CREATE INDEX (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql

## Issues Found
- The leftmost-prefix examples said queries missing the first indexed column could not use the index. Current PostgreSQL and MySQL documentation describe planner-dependent skip scan behavior, so this was changed to "usually no" and clarified as efficient leftmost-prefix use.
- The `orders(customer_id, order_date)` example said `customer_id` comes first because of higher selectivity. The example's stronger reason is equality-before-range access, so the comment was corrected.
- The date-only query comment said it cannot use the composite index. This was softened to "usually cannot use this index efficiently" to account for optimizer exceptions.
- The column-order guidance treated all `LIKE` predicates as range-friendly. This was narrowed to prefix `LIKE` patterns.
- The equality-column selectivity guidance was too absolute. It now also mentions reusable leftmost prefixes, which is important for composite index design.
- The EXPLAIN section implied any `Seq Scan` always means the index is simply unused and undesirable. It now clarifies the relevant table scan and notes that sequential scans can be normal for small tables or large result sets.
- The covering-index section implied a PostgreSQL covering index guarantees table-free access. PostgreSQL index-only scans also depend on MVCC visibility map state, so the text now says "potentially" and calls out visibility and planner conditions.
- The `INCLUDE` explanation was adjusted from leaf-node-specific wording to non-key column wording and clarified that a covering index is a prerequisite rather than a guarantee for PostgreSQL index-only scans.
- The multi-tenant indexing pattern said tenant filtering always applies and tenant_id should be first in every composite index. This was made conditional on tenant-scoped query patterns.

## Review Notes
The SQL examples use PostgreSQL-style syntax, including `SERIAL`, `INTERVAL`, partial indexes, and `INCLUDE`. The post remains broadly applicable conceptually, but future revisions could explicitly label the examples as PostgreSQL-focused and mention engine-specific differences for MySQL and SQL Server.
