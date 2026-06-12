# Validation Summary: How to Use Django with PostgreSQL Full-Text Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Django
- Python
- PostgreSQL
- PostgreSQL full-text search
- PostgreSQL `pg_trgm`
- Django PostgreSQL contrib search APIs
- Django migrations and indexes

## Sources Consulted
- Django full text search documentation: https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/search/
- Django PostgreSQL-specific index documentation: https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/indexes/
- Django model index reference: https://docs.djangoproject.com/en/6.0/ref/models/indexes/
- Django PostgreSQL migration operations documentation: https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/operations/
- PostgreSQL full text search introduction: https://www.postgresql.org/docs/current/textsearch-intro.html
- PostgreSQL `pg_trgm` documentation: https://www.postgresql.org/docs/current/pgtrgm.html

## Issues Found
- The post stated that PostgreSQL's full-text search default is `english`. PostgreSQL actually uses the database or session `default_text_search_config` when no config is specified. Updated the wording to describe this accurately.
- The multilingual search example accepted an arbitrary `lang` query parameter directly as the search configuration. Added a whitelist of supported configurations and a fallback to `english` so invalid input does not cause database errors.
- The trigram GIN index comment incorrectly referenced `GistIndex` while using `GinIndex` with `gin_trgm_ops`. Corrected the comment to state that it requires the `pg_trgm` extension and the `gin_trgm_ops` opclass.
- The combined full-text/trigram example imported unused `Value` and `Greatest`, but used `models.Q` without importing `models`. Updated the import to `F, Q` and changed the filter to use `Q(...)`.
- The combined search comments described full-text rank as `0 to 1`. PostgreSQL ranking is a relevance score where higher values are more relevant, but it is not inherently normalized to that range. Updated the comment.
- The boolean-query snippet imported `SearchQuery` but used `SearchVector`. Added `SearchVector` to the import.
- The highlighting section recommended `safe` without a caveat. Updated the wording to only use `safe` when highlighted content is trusted or sanitized.

## Review Notes
The examples are broadly aligned with current Django 6.0 PostgreSQL search APIs. Future improvements could mention that `SearchQuery(search_type='websearch')` requires PostgreSQL 11 or newer, and that generated columns can be an alternative to triggers for maintaining stored search vectors in PostgreSQL.
