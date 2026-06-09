# Validation Summary: How to Implement Pagination in FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3.x
- FastAPI
- SQLAlchemy (sync and async ORM)
- Pydantic v2
- PostgreSQL (via psycopg / asyncpg)
- Mermaid diagrams (documentation)

## Sources Consulted
- SQLAlchemy 2.0 migration guide — https://docs.sqlalchemy.org/en/20/changelog/migration_20.html
- SQLAlchemy ORM mapping API (declarative_base / DeclarativeBase) — https://docs.sqlalchemy.org/en/20/orm/mapping_api.html
- SQLAlchemy Core connections (textual SQL requirement) — https://docs.sqlalchemy.org/en/20/core/connections.html
- SQLAlchemy asyncio extension (async_sessionmaker) — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Pydantic v2 migration guide — https://docs.pydantic.dev/2.0/migration/
- FastAPI docs — https://fastapi.tiangolo.com/
- Python datetime documentation (utcnow deprecation in 3.12) — https://docs.python.org/3/library/datetime.html

## Issues Found

1. **Deprecated import path for `declarative_base`** — `from sqlalchemy.ext.declarative import declarative_base` was the SQLAlchemy 1.x location. In SQLAlchemy 2.0 the function is exposed from `sqlalchemy.orm`. Changed the import to `from sqlalchemy.orm import declarative_base, sessionmaker` (consolidating with the existing `sessionmaker` import).

2. **`datetime.utcnow` is deprecated in Python 3.12+** — Replaced `default=datetime.utcnow` with `default=lambda: datetime.now(timezone.utc)` and added `timezone` to the import line. The deprecation note in Python 3.12 explicitly recommends timezone-aware `datetime.now(UTC)`.

3. **Raw SQL string passed to `db.execute()` (critical, would raise at runtime in SQLAlchemy 2.0)** — In the `count_optimization.py` snippet, `db.execute("SELECT reltuples::bigint FROM pg_class WHERE relname = 'articles'")` would raise `ObjectNotExecutableError` in SQLAlchemy 2.0 because raw textual SQL must be wrapped in `text()`. Added `from sqlalchemy import text` and wrapped the SQL string with `text(...)`.

4. **Deprecated async session factory pattern** — The async pagination snippet used `sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)` which is the legacy 1.4 pattern. Replaced with the SQLAlchemy 2.0 recommended `async_sessionmaker(async_engine, expire_on_commit=False)` and updated the import to bring in `async_sessionmaker` from `sqlalchemy.ext.asyncio` (removed the unused `sessionmaker` import from `sqlalchemy.orm` in that snippet).

## Review Notes

- The Pydantic v2 `class Config: from_attributes = True` pattern in `ArticleResponse` still functions but emits a deprecation warning in Pydantic v2 — the modern equivalent is `model_config = ConfigDict(from_attributes=True)`. Left as-is because it remains functional; readers using current Pydantic versions will see the model work correctly.
- The cursor pagination ordering logic (`ORDER BY created_at DESC, id DESC` with `WHERE created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)`) is correctly composed for a descending sort — items "after" the cursor are those with smaller key values under that ordering.
- The keyset pagination logic mirrors the cursor variant correctly.
- Several snippets are presented as separate files and reuse identifiers (`ArticleResponse`, `HTTPException`, `Session`, etc.) defined in earlier snippets without re-importing them; this is a presentation choice consistent with tutorial conventions and not a technical error.
- The performance numbers in the comparison table at the top are illustrative ballpark figures rather than benchmarked data; they correctly reflect the relative scaling characteristics of each strategy (offset degrades with depth, cursor/keyset remain flat).
- The `limit_offset.py` snippet truncates with a `# Continue with normal pagination...` comment and does not show the import for `HTTPException`; this is acceptable as a partial illustrative snippet.
