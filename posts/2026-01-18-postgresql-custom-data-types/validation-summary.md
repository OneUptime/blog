# Validation Summary: How to Create Custom Data Types in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- PostgreSQL enum types
- PostgreSQL composite types
- PostgreSQL domain types
- PostgreSQL range types
- PostgreSQL arrays
- PostgreSQL casts
- PostgreSQL system catalogs

## Sources Consulted
- PostgreSQL 18 documentation: Enumerated Types - https://www.postgresql.org/docs/current/datatype-enum.html
- PostgreSQL 18 documentation: Composite Types - https://www.postgresql.org/docs/current/rowtypes.html
- PostgreSQL 18 documentation: Value Expressions - https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL 18 documentation: Domain Types - https://www.postgresql.org/docs/current/domains.html
- PostgreSQL 18 documentation: Range Types - https://www.postgresql.org/docs/current/rangetypes.html
- PostgreSQL 18 documentation: CREATE TYPE - https://www.postgresql.org/docs/current/sql-createtype.html
- PostgreSQL 18 documentation: ALTER TYPE - https://www.postgresql.org/docs/current/sql-altertype.html
- PostgreSQL 18 documentation: CREATE CAST - https://www.postgresql.org/docs/current/sql-createcast.html
- PostgreSQL 18 documentation: pg_type catalog - https://www.postgresql.org/docs/current/catalog-pg-type.html

## Issues Found
- The enum comparison comment said `status >= 'shipped'` returns only `shipped` and `delivered`. PostgreSQL enum ordering follows declaration order, so it also includes `cancelled`. Updated the comment.
- The `reservations` exclusion constraint used GiST equality on an integer column without enabling `btree_gist`. Added `CREATE EXTENSION IF NOT EXISTS btree_gist;` before the table definition.
- The domain `NOT NULL` example created a `products` table, which conflicted with the later product catalog example if the snippets are run in order. Renamed the earlier demo table to `product_names`.
- The custom `CREATE CAST (text AS email)` example targeted a domain. PostgreSQL warns that casts to or from a domain have no effect, and assignment to a domain already checks constraints. Replaced it with accurate domain assignment and re-casting examples.
- The email domain comment claimed RFC 5322 compliance, but the regex is a simple practical format check, not full RFC 5322 validation. Updated the comment text.
- The custom type listing query included ordinary table row types because PostgreSQL creates composite types for tables. Added a `pg_class` join and `relkind = 'c'` filter for standalone composite types.

## Review Notes
Validated the edited SQL snippets against a local PostgreSQL 18 container. The only runtime errors observed were the intentional examples shown in the post: invalid enum value, domain constraint violations, empty `non_empty_text`, and overlapping reservation ranges.
