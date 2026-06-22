# Validation Summary: How to Create Effective Indexes in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL indexes
- B-tree, Hash, GiST, GIN, and BRIN indexes
- Partial, expression, multicolumn, and covering indexes
- PostgreSQL full-text search
- JSONB and array indexing
- PostGIS spatial indexes

## Sources Consulted
- PostgreSQL 18 Documentation: Chapter 11, Indexes - https://www.postgresql.org/docs/current/indexes.html
- PostgreSQL 18 Documentation: 11.2 Index Types - https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL 18 Documentation: 11.3 Multicolumn Indexes - https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL 18 Documentation: 11.7 Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html
- PostgreSQL 18 Documentation: 11.8 Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL 18 Documentation: 11.9 Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL 18 Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18 Documentation: JSON Types and JSONB Indexing - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL 18 Documentation: Preferred Index Types for Text Search - https://www.postgresql.org/docs/current/textsearch-indexes.html
- PostgreSQL 18 Documentation: BRIN Indexes - https://www.postgresql.org/docs/current/brin.html
- PostGIS Documentation: ST_DWithin - https://postgis.net/docs/ST_DWithin.html

## Issues Found
- Changed the opening claim from covering all PostgreSQL index types to covering the most commonly used index types, because PostgreSQL also documents SP-GiST and extension-provided index methods such as bloom.
- Renamed duplicate example indexes in the `CREATE INDEX CONCURRENTLY`, GIN operator class, and BRIN examples so the snippets do not fail when run sequentially.
- Added a B-tree prefix `LIKE` caveat for compatible collations/operator classes, matching PostgreSQL's documented pattern-matching index behavior.
- Refined the multicolumn index ordering rule to emphasize equality filters and common query prefixes instead of a blanket "most selective first" rule.
- Wrapped the `EXTRACT(YEAR FROM created_at)` expression index in an extra set of parentheses so it is valid `CREATE INDEX` expression syntax.
- Removed range types from the GIN "When to Use" list because PostgreSQL's built-in range indexing guidance centers on GiST and SP-GiST, not GIN.
- Updated full-text search examples to use `COALESCE` for nullable text columns and `to_tsquery('english', ...)` to match the indexed text search configuration.
- Replaced the placeholder relation name `table` in GIN operator class examples with `data_table`, and clarified that `jsonb_path_ops` supports fewer operators rather than only `@>`.
- Fixed the PostGIS `ST_DWithin` example by indexing and querying the same geography expression instead of mixing a geometry column with a geography argument.
- Changed the covering-index wording from "query uses index-only scan" to "query can use an index-only scan" and clarified that included columns are not search keys, rather than saying they cannot appear in `WHERE`.
- Replaced the `WHERE expires_at > NOW()` partial index predicate with `WHERE revoked_at IS NULL`, because PostgreSQL requires functions in index definitions and predicates to be immutable.

## Review Notes
The guide is technically valid after these fixes. Some examples still depend on application-specific schemas and data types, so readers should adapt column names and operator classes to their actual workload and verify plans with `EXPLAIN ANALYZE`.
