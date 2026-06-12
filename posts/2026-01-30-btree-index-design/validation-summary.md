# Validation Summary: How to Create B-Tree Index Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL B-tree indexes
- MySQL B-tree indexes
- SQL `CREATE INDEX`, `EXPLAIN`, and index maintenance commands
- Composite, covering, partial, and expression indexes
- PostgreSQL and MySQL index usage statistics

## Sources Consulted
- PostgreSQL documentation: B-tree index types and supported operators: https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL documentation: multicolumn indexes and skip scan behavior: https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL documentation: indexes and `ORDER BY`: https://www.postgresql.org/docs/current/indexes-ordering.html
- PostgreSQL documentation: `CREATE INDEX`, expression indexes, partial indexes, `INCLUDE`, and concurrent index builds: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL documentation: index-only scans and visibility map behavior: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL documentation: `REINDEX` and `REINDEX CONCURRENTLY`: https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL documentation: cumulative statistics and `pg_stat_user_indexes` counters: https://www.postgresql.org/docs/current/monitoring-stats.html
- MySQL documentation: `CREATE INDEX` syntax and BTREE index type: https://dev.mysql.com/doc/refman/9.7/en/create-index.html
- MySQL documentation: how MySQL uses indexes and leftmost prefixes: https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html
- MySQL documentation: Index Merge optimization for `OR` conditions: https://dev.mysql.com/doc/refman/9.7/en/index-merge-optimization.html
- MySQL Performance Schema documentation: `table_io_waits_summary_by_index_usage`: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html

## Issues Found
- The composite-index section said an index on `(A, B, C)` cannot be used for predicates on only `B` or `C`. PostgreSQL can sometimes use skip scan, and even without skip scan the more precise point is that the index is usually not efficient without the leading column. I changed the wording to avoid the absolute claim.
- The range-condition guidance said ranges stop further index use. PostgreSQL can still check later-column constraints in the index, though they may not narrow the scanned range. I updated the wording to reflect that nuance.
- The covering-index explanation said the database can satisfy the query entirely from the index without table access. In PostgreSQL, index-only scans also depend on visibility-map state. I added that caveat and marked the `INCLUDE` example as PostgreSQL syntax.
- The partial-index examples were not labeled as PostgreSQL-specific. I added that note because the shown `WHERE` clause syntax for partial indexes is PostgreSQL syntax, not portable MySQL syntax.
- The prefix `LIKE` example omitted PostgreSQL's non-C-locale operator-class caveat. I added a note about `text_pattern_ops`.
- The `OR` predicate example said the database will use bitmap OR. I changed this to database-specific wording: PostgreSQL may use `BitmapOr`, while MySQL may use Index Merge.
- The MySQL unused-index query did not actually filter unused indexes. I changed it to filter `count_read = 0` and clarified that this is since the Performance Schema statistics were last reset.
- The `REINDEX INDEX CONCURRENTLY` comment said "no locks." PostgreSQL documents this as minimum locking of writes, not no locking at all. I corrected the comment.
- The PostgreSQL "check index bloat" query only listed index sizes. I changed the comment to describe it as an index-size query and note that bloat estimates require a dedicated query or extension.
- The real-world example described a reporting index for active orders, but the query and predicate used `status = 'completed'`. I corrected the comment and labeled the partial covering index syntax as PostgreSQL-specific.
- The decision tree said all-equality composite indexes can be in any order with high-cardinality columns first. I changed this to prefer matching query prefixes and selective columns when possible, which better reflects practical composite-index design.

## Review Notes
The post is technically relevant and valid after the corrections. Some examples are PostgreSQL-specific while the article also mentions MySQL, so future revisions could add parallel MySQL versions for PostgreSQL-only features such as partial indexes and `INCLUDE` columns.
