# Validation Summary: How to Use Accent-Insensitive Collations in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- ICU collations
- Nondeterministic collations
- unaccent extension
- pg_trgm extension
- PostgreSQL full-text search
- SQL expression indexes

## Sources Consulted
- PostgreSQL 18 documentation: Collation Support - https://www.postgresql.org/docs/current/collation.html
- PostgreSQL 18 documentation: unaccent - https://www.postgresql.org/docs/current/unaccent.html
- PostgreSQL 18 documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL 18 documentation: Dictionaries - https://www.postgresql.org/docs/current/textsearch-dictionaries.html
- PostgreSQL 18 documentation: Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html

## Issues Found
- Corrected the ICU collation version from PostgreSQL 10+ to PostgreSQL 12+ because the examples rely on nondeterministic collations with `deterministic = false`, which are not a PostgreSQL 10 feature.
- Updated the ICU collation comment from the older `@colStrength=primary` terminology to the BCP 47 `ks-level1` setting used by the actual SQL.
- Changed the case-insensitive pattern-search comment from `ILIKE` to `lower()` plus `LIKE`, matching the SQL shown.
- Fixed expression index examples to use the immutable wrapper instead of calling `unaccent(...)` directly. PostgreSQL requires functions used in expression indexes to be immutable, while `unaccent` is stable.
- Clarified that the immutable `unaccent` wrapper is appropriate only when the rules file is treated as fixed.
- Corrected the full-text search result comment so it matches the inserted data.
- Replaced the incorrect `SHOW lc_messages` guidance for finding custom `unaccent` rules with the documented `$SHAREDIR/tsearch_data/` location, expressed as `$(pg_config --sharedir)/tsearch_data/`.

## Review Notes
The SQL was reviewed against official PostgreSQL documentation. I could not execute the examples locally because `psql` is not installed in the workspace.
