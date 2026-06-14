# Validation Summary: How to Use Index Types Effectively in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL indexing
- B-tree, Hash, GIN, GiST, BRIN, and SP-GiST indexes
- Partial indexes and expression indexes
- PostgreSQL JSONB, arrays, full-text search, range types, and geometric types
- PostgreSQL statistics views and pageinspect/btree_gist extensions

## Sources Consulted
- PostgreSQL documentation: Index Types - https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL documentation: Multicolumn Indexes - https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL documentation: Operator Classes and Operator Families - https://www.postgresql.org/docs/current/indexes-opclass.html
- PostgreSQL documentation: Indexes and ORDER BY - https://www.postgresql.org/docs/current/indexes-ordering.html
- PostgreSQL documentation: Hash Indexes - https://www.postgresql.org/docs/current/hash-index.html
- PostgreSQL documentation: GIN Indexes - https://www.postgresql.org/docs/current/gin.html
- PostgreSQL documentation: JSON Types - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL documentation: GiST Indexes - https://www.postgresql.org/docs/current/gist.html
- PostgreSQL documentation: btree_gist - https://www.postgresql.org/docs/current/btree-gist.html
- PostgreSQL documentation: pageinspect - https://www.postgresql.org/docs/current/pageinspect.html
- PostgreSQL documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL documentation: Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Monitoring Statistics - https://www.postgresql.org/docs/current/monitoring-stats.html

## Issues Found
- Clarified B-tree prefix pattern matching. PostgreSQL can use B-tree indexes for anchored patterns, but databases not using the `C` locale need pattern operator classes such as `text_pattern_ops`.
- Reworded absolute planner claims from "will use" to "can use" where PostgreSQL only considers an index and may choose another plan.
- Corrected the multicolumn B-tree example. A query that skips the left-most column is usually much less useful, but PostgreSQL can sometimes still use the index, including via skip scan.
- Corrected the Hash index description. Hash indexes are equality-only and may be smaller for longer values, but they are not categorically smaller and faster than B-tree indexes in every simple equality lookup.
- Corrected the JSONB `jsonb_path_ops` explanation. It supports `@>`, `@?`, and `@@`, but not key-existence operators such as `?`, `?|`, and `?&`.
- Clarified that GiST network address indexing needs the `inet_ops` operator class for `inet` and `cidr`.
- Removed the incorrect claim that point KNN GiST nearest-neighbor queries require `pg_trgm`; the shown point distance query uses KNN GiST.
- Added `CREATE EXTENSION IF NOT EXISTS btree_gist;` before the GiST exclusion constraint example because `room_id WITH =` on an integer column requires the extension's GiST operator class.
- Replaced the BRIN inspection query using `brin_page_items` on page 0 with `brin_metapage_info(get_raw_page(..., 0))`, and noted the `pageinspect` extension and superuser requirement.
- Corrected the partial-index usage comments to avoid overclaiming planner behavior.

## Review Notes
- The examples are intentionally schematic and assume the referenced tables and columns already exist unless the snippet creates them.
- The expression index on `DATE(created_at)` is valid when the expression is immutable for the column type, such as `timestamp without time zone`; `timestamptz` date extraction can require a more explicit immutable expression.
