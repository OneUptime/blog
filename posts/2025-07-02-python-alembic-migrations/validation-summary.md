# Validation Summary: How to Handle Database Migrations with Alembic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Alembic (database migration framework)
- SQLAlchemy (2.0-style ORM with `DeclarativeBase`)
- PostgreSQL (UUID, JSONB, GIN indexes, full-text search / `tsvector`, triggers)
- psycopg2 / asyncpg drivers
- GitHub Actions (CI/CD integration)
- pytest (migration testing)

## Sources Consulted
- Alembic documentation — Tutorial, env.py, autogenerate, offline mode, branches/merge: https://alembic.sqlalchemy.org/en/latest/
- Alembic configuration (`alembic.ini`, `file_template`, `post_write_hooks`, `truncate_slug_length`, `timezone`): https://alembic.sqlalchemy.org/en/latest/tutorial.html and https://alembic.sqlalchemy.org/en/latest/cookbook.html
- Alembic operations reference (`op.create_table`, `op.create_index`, `op.add_column`, `op.execute`, `op.get_bind`): https://alembic.sqlalchemy.org/en/latest/ops.html
- SQLAlchemy 2.0 ORM Declarative documentation, including reserved attribute names (`metadata`, `registry`): https://docs.sqlalchemy.org/en/20/orm/declarative_styles.html and https://docs.sqlalchemy.org/en/20/orm/mapping_api.html
- SQLAlchemy `Column` / `Index` / `__table_args__` documentation: https://docs.sqlalchemy.org/en/20/core/metadata.html
- PostgreSQL full-text search (`to_tsvector`, `setweight`, GIN indexes) and trigger documentation: https://www.postgresql.org/docs/current/textsearch.html

## Issues Found
1. **Reserved attribute name `metadata` in the `Post` SQLAlchemy model (critical — would crash at import).**
   - The `Post` model defined `metadata = Column(JSONB, ...)`. In SQLAlchemy's Declarative API, `metadata` is a reserved attribute name (it holds the `MetaData` object, as used elsewhere in the post via `Base.metadata`). Mapping a column attribute named `metadata` raises `sqlalchemy.exc.InvalidRequestError: Attribute name 'metadata' is reserved when using the Declarative API.` The model would fail to define, breaking every example downstream.
   - **Fix:** Renamed the Python attribute to `post_metadata` while explicitly naming the database column `"metadata"` via `Column("metadata", JSONB, ...)`. This preserves the exact database schema (so all the generated migration scripts, raw SQL data migrations, and the `ix_posts_metadata` GIN index — which all reference the DB column name `metadata` — remain correct and unchanged).
   - Also updated the corresponding `Index("ix_posts_metadata", "metadata", postgresql_using="gin")` in `__table_args__` to reference the new attribute key `"post_metadata"`, since `Index` string arguments resolve against the column collection by attribute key. A short explanatory comment was added noting the reserved-name caveat.

## Review Notes
- The generated migration file, the manual full-text-search migration (trigger + `tsvector` + GIN index), the data migration (`split_part`/`substring`), and the batched JSONB migration are all technically correct PostgreSQL/Alembic usage.
- The `env.py` (including the `postgres://` → `postgresql://` normalization and `NullPool` for migrations) and `alembic.ini` (escaped `%%` interpolation tokens, `post_write_hooks`, logger sections) are accurate and current for SQLAlchemy 2.0 / recent Alembic.
- Minor, non-blocking observations (not changed, as they are not errors):
  - The models import `Optional`, `List`, `Mapped`, and `mapped_column` but use the classic `Column` mapping style; these imports are unused. Harmless, and mixing styles is valid.
  - In `deploy_migrations.py`, `ScriptDirectory.walk_revisions("head", current)` passes arguments positionally as `(base, head)`; the resulting list is then filtered against the current revision. It works for the illustrative purpose but the argument ordering is easy to misread — a future cleanup could name the arguments explicitly.
  - `op.drop_index(..., postgresql_using='gin')` passes a dialect kwarg on drop that is accepted but not strictly required; left as-is for symmetry with the create calls.
