# Validation Summary: How to Implement Full-text Search in Django

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Django (django.contrib.postgres)
- PostgreSQL full-text search (tsvector, tsquery, ts_rank)
- Django ORM features: SearchVector, SearchQuery, SearchRank, SearchHeadline, SearchVectorField
- Django indexes: GinIndex
- Django signals (post_save)
- PostgreSQL triggers (PL/pgSQL)
- Django forms and templates

## Sources Consulted
- Django docs — Full text search (django.contrib.postgres.search): https://docs.djangoproject.com/en/5.1/ref/contrib/postgres/search/
- Django docs — `__search` lookup: https://docs.djangoproject.com/en/5.1/ref/models/lookups/
- Django docs — GinIndex: https://docs.djangoproject.com/en/5.1/ref/contrib/postgres/indexes/#ginindex
- PostgreSQL docs — Text Search Functions and Operators: https://www.postgresql.org/docs/current/functions-textsearch.html
- PostgreSQL docs — Controlling Text Search (setweight, to_tsvector, ts_rank defaults): https://www.postgresql.org/docs/current/textsearch-controls.html
- PostgreSQL docs — CREATE TRIGGER (EXECUTE FUNCTION syntax, PG 11+): https://www.postgresql.org/docs/current/sql-createtrigger.html

## Issues Found
No technical issues found.

Verified items:
- `SearchVector`, `SearchQuery`, `SearchRank`, `SearchHeadline`, `SearchVectorField` import paths from `django.contrib.postgres.search` are correct.
- `GinIndex` import path from `django.contrib.postgres.indexes` is correct.
- Weight class multipliers (A: 1.0, B: 0.4, C: 0.2, D: 0.1) match PostgreSQL's default `ts_rank` weights `{0.1, 0.2, 0.4, 1.0}` for {D, C, B, A}.
- `SearchQuery` accepts the documented `search_type` values: `plain` (default), `phrase`, `raw`, `websearch`. The post's use of `'phrase'` and `'raw'` is correct.
- The prefix-search pattern `SearchQuery(f'{partial_word}:*', search_type='raw')` correctly relies on `raw` to pass tsquery syntax through.
- `SearchHeadline` keyword arguments (`start_sel`, `stop_sel`, `max_words`, `min_words`) are valid.
- `SearchQuery` operators `|` (OR), `&` (AND), and `~` (NOT) are valid combinators.
- The PL/pgSQL trigger uses `CREATE TRIGGER ... EXECUTE FUNCTION ...`, which is the PostgreSQL 11+ syntax (the prior `EXECUTE PROCEDURE` still works but `EXECUTE FUNCTION` is the modern form).
- `setweight(to_tsvector('english', COALESCE(...)), 'X')` usage and concatenation with `||` are correct PostgreSQL idioms.
- The `__search` lookup on `CharField`/`TextField` exists in Django for the PostgreSQL backend.
- The signal handler uses `Post.objects.filter(pk=instance.pk).update(...)` to avoid recursive `post_save` triggers, which is correct (querysets' `update()` does not emit save signals).
- `AppConfig.ready()` is the documented place to import signal modules.
- Template tags and the Django Paginator usage are syntactically correct.

## Review Notes
- The `from django.db.models import Q` import in the first simple search example is unused. Not a technical error, just dead code; left as-is to preserve the author's style.
- The `__search` lookup requires `django.contrib.postgres` to be in `INSTALLED_APPS`. The post does not call this out explicitly. Not incorrect — most readers using `django.contrib.postgres.search` imports will already have it installed — but adding a note could help newcomers.
- `results.count()` in `search_view` runs a second SQL `COUNT(*)` query in addition to the paginator's queries. For high-traffic search endpoints, using `page_obj.paginator.count` (already computed by the paginator) would avoid the extra round-trip. Not incorrect, just a possible optimization.
- The `CREATE TRIGGER` statement is not `CREATE OR REPLACE TRIGGER`; replaying the migration on the same DB would fail. Acceptable since Django migrations are idempotent by tracking applied state; flagged only for awareness.
- For multilingual content with a stored `SearchVectorField`, the post correctly notes that per-language triggers (or a configurable approach) are needed; no further detail provided, which is fine for an introductory guide.
