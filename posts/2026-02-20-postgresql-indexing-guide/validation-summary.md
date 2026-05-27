# Validation Summary: How to Use PostgreSQL Indexes Effectively

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL B-tree, hash, GIN, and GiST indexes
- Partial indexes
- Covering indexes and index-only scans
- Concurrent index creation and reindexing
- PostgreSQL statistics views and size functions

## Sources Consulted
- PostgreSQL Documentation: Chapter 11, Indexes: https://www.postgresql.org/docs/current/indexes.html
- PostgreSQL Documentation: Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL Documentation: Multicolumn Indexes: https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL Documentation: Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL Documentation: Index-Only Scans and Covering Indexes: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL Documentation: CREATE INDEX: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: REINDEX: https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL Documentation: The Cumulative Statistics System: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: System Administration Functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL Documentation: GiST Indexes: https://www.postgresql.org/docs/current/gist.html
- PostgreSQL Documentation: GIN Indexes: https://www.postgresql.org/docs/current/gin.html

## Issues Found
- The single-column B-tree example claimed an index on `email` was good for `WHERE created_at > ...` and `ORDER BY created_at DESC`. Updated the comments so the `email` index is described only for `email` filtering and ordering.
- The composite-index guidance said to put high-selectivity columns first. Updated it to recommend matching leading equality columns before range/sort columns, which aligns better with PostgreSQL's multicolumn B-tree behavior.
- The hash-index section claimed hash indexes are faster than B-tree indexes for equality lookups. Changed this to a more accurate recommendation: hash indexes support equality lookups, but B-tree remains the usual default unless benchmarking shows a benefit.
- The GiST range-query comment used `WHERE tsrange @> ...`, which is not a valid expression for the shown expression index. Updated it to `WHERE tsrange(start_time, end_time) @> ...`.
- The partial-index example used `now() - interval '90 days'` in the predicate. PostgreSQL requires functions in index definitions and predicates to be immutable, so this was replaced with a fixed cutoff date and a note about periodically refreshing rolling-window indexes.
- The covering-index explanation implied PostgreSQL can always satisfy the query entirely from the index. Added the visibility-map caveat required for index-only scans.
- The unique-index comment said a unique index also acts as a constraint. Adjusted it to say it enforces uniqueness like a unique constraint.
- The `pg_indexes` size query used only `quote_ident(indexname)::text`, which can fail or resolve incorrectly when names need schema qualification. Updated it to schema-qualify the relation before casting to `regclass`.
- The maintenance section labeled a simple size query as an index-bloat check. Updated the comment to describe it as a starting point for bloat investigation.

## Review Notes
The post is technically relevant and useful after these corrections. Future improvements could mention that `CREATE INDEX CONCURRENTLY` and `REINDEX CONCURRENTLY` have additional caveats on partitioned objects and transaction blocks, but the existing guidance is accurate for the examples shown.
