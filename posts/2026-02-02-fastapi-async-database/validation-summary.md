# Validation Summary: How to Use Async Database Connections in FastAPI

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- FastAPI (async lifespan, dependency injection, routers)
- SQLAlchemy 2.0 async (`create_async_engine`, `async_sessionmaker`, `AsyncSession`)
- asyncpg (PostgreSQL async driver)
- aiosqlite (SQLite async driver for tests)
- Pydantic v2 / pydantic-settings (`BaseModel`, `ConfigDict`, `BaseSettings`)
- Alembic (mentioned in dependencies)
- passlib (bcrypt password hashing)
- pytest / pytest-asyncio / httpx (async testing)

## Sources Consulted
- SQLAlchemy 2.0 async docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- SQLAlchemy 2.0 textual SQL (`text()`) requirement: https://docs.sqlalchemy.org/en/20/core/connections.html#sqlalchemy.engine.Connection.execute
- SQLAlchemy `async_sessionmaker` reference: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html#sqlalchemy.ext.asyncio.async_sessionmaker
- SQLAlchemy declarative `Mapped` / `mapped_column` (2.0 style): https://docs.sqlalchemy.org/en/20/orm/declarative_styles.html
- SQLAlchemy relationship loading strategies (`selectinload`, `joinedload`): https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
- SQLAlchemy pool events / `event.listens_for` for `Pool`: https://docs.sqlalchemy.org/en/20/core/pooling.html#pool-events
- FastAPI lifespan events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI dependency injection: https://fastapi.tiangolo.com/tutorial/dependencies/
- Pydantic v2 settings management: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- asyncpg driver: https://magicstack.github.io/asyncpg/current/

## Issues Found
- **Raw SQL string passed to `Connection.execute()` (lines 1304 and 1336 of original README)**: The code called `await conn.execute("SELECT 1")` in both the lifespan startup check and the `/health` endpoint. Since SQLAlchemy 2.0, passing a raw string to `Connection.execute()` raises `ArgumentError: Textual SQL expression should be explicitly declared as text()`. Fixed by importing `from sqlalchemy import text` in `app/main.py` and wrapping both calls as `await conn.execute(text("SELECT 1"))`.

## Review Notes
- `datetime.utcnow` is used as the default callable for the `created_at`/`updated_at` columns. This emits a `DeprecationWarning` on Python 3.12+ (the recommended replacement is `lambda: datetime.now(timezone.utc)` or `func.now()` at the database level). The pattern still functions correctly and is extremely common in SQLAlchemy tutorials, so it was left as-is. Worth noting for a future revision.
- `pip install fastapi[all]` is still valid but FastAPI 0.100+ now recommends `fastapi[standard]` as the lighter, default extras group. The `[all]` extra still works and resolves, so this was not changed.
- The pytest fixtures use `@pytest.fixture` for async generators. With modern pytest-asyncio this requires `asyncio_mode = "auto"` in pyproject/pytest config, or the fixtures should use `@pytest_asyncio.fixture`. The post does not explicitly mention configuring `asyncio_mode`, which could trip up readers, but the code as written can be made to work via configuration so it is not strictly incorrect.
- The `event_loop` fixture is deprecated in recent pytest-asyncio releases (8.x); recommended approach is to configure `asyncio_default_fixture_loop_scope`. Still works in older versions, kept as-is.
- The example `get_user_with_nested_relations` references `Post.comments` and `User.followers` relationships that are not defined on the `Post`/`User` models earlier in the post. This is presented as illustrative of chained loading syntax and would only fail if a reader copies it verbatim without defining those relationships. Left as-is because it is clearly an example pattern.
- `pool.invalidatedcount` is not a documented attribute on SQLAlchemy `QueuePool`; the `hasattr` guard correctly defends against this, so it is harmless.
- The pool-calculation example math is correct: with 200 expected concurrent requests and 100 max DB connections, the function returns `pool_size=40`, `max_overflow=40` as the comment claims.
- `select(insert)` -> `result.rowcount` for executemany INSERT may return `-1` on some drivers (including asyncpg in certain SQLAlchemy versions); the post's claim that it returns the inserted count is generally accurate for the common path but readers should not rely on it for asyncpg without testing.
