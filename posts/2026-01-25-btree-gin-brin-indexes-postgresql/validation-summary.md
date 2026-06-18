# Validation Summary: How to Choose Between B-Tree, GIN, and BRIN Indexes in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- B-Tree indexes
- GIN indexes
- BRIN indexes
- JSONB indexing
- Full-text search
- pg_trgm trigram indexing
- EXPLAIN ANALYZE

## Sources Consulted
- PostgreSQL Documentation: Index Types - https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL Documentation: B-Tree Indexes - https://www.postgresql.org/docs/current/btree.html
- PostgreSQL Documentation: GIN Indexes - https://www.postgresql.org/docs/current/gin.html
- PostgreSQL Documentation: BRIN Indexes - https://www.postgresql.org/docs/current/brin.html
- PostgreSQL Documentation: JSON Types / jsonb Indexing - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL Documentation: Operator Classes and Operator Families - https://www.postgresql.org/docs/current/indexes-opclass.html
- PostgreSQL Documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL Documentation: Multicolumn Indexes - https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: CLUSTER - https://www.postgresql.org/docs/current/sql-cluster.html
- PostgreSQL Documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html

## Issues Found
- Clarified left-anchored `LIKE` with B-Tree indexes. PostgreSQL may need `text_pattern_ops` or `varchar_pattern_ops` for efficient pattern matching under non-C collations, so the B-Tree usage bullet now includes that caveat.
- Corrected the JSONB B-Tree limitation example. A plain B-Tree index is not appropriate for JSONB containment, but extracted scalar equality such as `data->>'type' = 'click'` can use a B-Tree expression index. The example now distinguishes those cases.
- Added the required `pg_trgm` details for trigram GIN indexing. The post now notes that trigram similarity requires the `pg_trgm` extension and a `gin_trgm_ops` operator class.
- Corrected the BRIN maintenance clustering example. To restore physical ordering by timestamp, the table should be clustered using an order-supporting index on `recorded_at`, not implicitly by the primary key.
- Reworded the conclusion to avoid saying GIN is strictly required for all JSONB and full-text use cases. PostgreSQL also supports B-Tree expression indexes for JSONB scalar extraction and GiST for full-text search.

## Review Notes
The examples are syntactically valid PostgreSQL SQL snippets assuming the referenced tables and columns exist. Some performance claims, such as exact index sizes and specific plan node choices, remain workload-dependent and should be treated as illustrative rather than guaranteed.
