# Validation Summary: How to Create Unique Constraints with NULL Values in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL unique constraints
- PostgreSQL unique indexes
- PostgreSQL partial indexes
- PostgreSQL foreign keys

## Sources Consulted
- PostgreSQL 18 Documentation: Constraints - https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL 18 Documentation: Unique Indexes - https://www.postgresql.org/docs/current/indexes-unique.html
- PostgreSQL 18 Documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL 18 Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18 Documentation: CREATE TABLE - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 15 Release Notes - https://www.postgresql.org/docs/15/release-15.html

## Issues Found
- The post described PostgreSQL's default unique-constraint NULL behavior as "the SQL standard behavior." PostgreSQL documentation says the SQL standard leaves default NULL treatment in unique constraints implementation-defined, so I changed the wording to identify it as PostgreSQL's default behavior and clarify the portability caveat.
- The "Partial Unique Indexes for Pre-PostgreSQL 15" section implied the shown partial index was equivalent to `NULLS NOT DISTINCT`, but the example enforces uniqueness only for non-NULL values and still allows multiple NULLs. I retitled and reworded the section to describe optional-value uniqueness accurately.
- The composite pre-15 `COALESCE` index used a sentinel-value approach without noting the sentinel must be outside valid application data. I added that caveat and wrapped the expressions in explicit parentheses to match PostgreSQL `CREATE INDEX` expression syntax.
- The performance section stated that partial indexes are smaller and faster than full indexes. PostgreSQL documentation supports this conditionally, so I changed the wording to say partial indexes can be smaller and faster for queries using the same predicate.

## Review Notes
The remaining examples align with PostgreSQL documentation: PostgreSQL 15 introduced `UNIQUE NULLS NOT DISTINCT`; unique constraints create B-tree indexes; unique partial indexes can enforce uniqueness over subsets of rows; foreign keys with default `MATCH SIMPLE` allow NULL referencing columns without requiring a referenced row; and multicolumn unique constraints reject duplicates only when all indexed values compare equal under the configured NULL treatment.
