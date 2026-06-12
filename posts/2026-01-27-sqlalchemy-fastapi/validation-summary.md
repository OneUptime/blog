# Validation Summary: How to Use SQLAlchemy with FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.10+ syntax with `Mapped[]`, `Annotated[]`, `list[dict]`)
- FastAPI (dependency injection, `Annotated[..., Depends(...)]` pattern)
- SQLAlchemy 2.0 (async engine, `DeclarativeBase`, `Mapped`/`mapped_column`)
- asyncpg (PostgreSQL async driver)
- aiosqlite (SQLite async driver, used in tests)
- Alembic (database migrations with async support)
- pytest / pytest-asyncio (async test fixtures)
- httpx (`AsyncClient` + `ASGITransport` for FastAPI testing)
- Pydantic (referenced via import only)

## Sources Consulted
- SQLAlchemy 2.0 ORM documentation — Declarative mapping with `Mapped[]`/`mapped_column`: https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html
- SQLAlchemy 2.0 async I/O documentation: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- SQLAlchemy 2.0 `async_sessionmaker` and `AsyncSession` API: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html#sqlalchemy.ext.asyncio.async_sessionmaker
- SQLAlchemy connection pool parameters (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`): https://docs.sqlalchemy.org/en/20/core/pooling.html
- SQLAlchemy loader options (`selectinload`, `joinedload`): https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
- FastAPI dependencies with `yield`: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/
- FastAPI SQL (Relational) Databases tutorial: https://fastapi.tiangolo.com/tutorial/sql-databases/
- Alembic async template (`env.py` async pattern using `async_engine_from_config` + `connection.run_sync`): https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic
- Alembic CLI commands (`revision --autogenerate`, `upgrade head`, `downgrade -1`, `history`, `current`): https://alembic.sqlalchemy.org/en/latest/tutorial.html
- httpx `ASGITransport` (introduced for ASGI app testing in httpx 0.27+): https://www.python-httpx.org/async/#calling-into-python-web-apps
- pytest-asyncio fixtures: https://pytest-asyncio.readthedocs.io/

## Issues Found
No technical issues found. Verified items:
- `pip install fastapi sqlalchemy[asyncio] asyncpg alembic uvicorn` — the `[asyncio]` extra correctly pulls in `greenlet`.
- `postgresql+asyncpg://` URL scheme is correct for the asyncpg driver.
- `create_async_engine` connection pool kwargs (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`) all exist and behave as described.
- `async_sessionmaker(..., class_=AsyncSession, expire_on_commit=False)` is the canonical 2.0 pattern.
- `DeclarativeBase`, `Mapped[T]`, `mapped_column(...)` is the official 2.0 style.
- Relationship cascade `"all, delete-orphan"` and `ondelete="CASCADE"` foreign-key option are valid.
- `Annotated[AsyncSession, Depends(get_async_session)]` matches the FastAPI dependency-injection pattern.
- 2.0-style query construction (`select(...).where(...)`, `update(...).values(...)`, `delete(...).where(...)`) with `await session.execute(...)` is correct; `result.scalar_one_or_none()`, `result.scalars().all()`, `result.rowcount`, `result.all()` are all valid Result APIs.
- `selectinload`, `joinedload` import paths and usage are correct.
- The Alembic async `env.py` mirrors the official async template: `async_engine_from_config(..., poolclass=pool.NullPool)`, `await connection.run_sync(do_run_migrations)`, `asyncio.run(run_async_migrations())`.
- The Alembic CLI commands shown are all valid (`alembic init`, `alembic revision --autogenerate -m`, `alembic upgrade head`, `alembic downgrade -1`, `alembic history --verbose`, `alembic current`).
- Test setup uses `sqlite+aiosqlite:///:memory:`, which is the correct async SQLite URL.
- `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` is the modern (httpx 0.27+) replacement for the older `app=` kwarg.
- `app.dependency_overrides[get_async_session] = override_get_session` is the documented FastAPI override pattern.
- `session.stream(select(User))` returning an `AsyncResult` you iterate via `result.scalars()` is correct for 2.0 async.
- `session.add_all(...)` for bulk inserts and `text("SELECT ... :date", {"date": ...})` for parameterized raw SQL are both valid.

## Review Notes
- The `get_session_with_transaction` helper is typed as `-> AsyncSession` but is an async generator; strictly it should be `AsyncGenerator[AsyncSession, None]`. This is a minor cosmetic typing imprecision that does not affect runtime behavior; left unchanged to preserve author voice.
- `lazyload` is imported in `relationships.py` but not used in the snippet. Harmless; left as-is.
- Committing inside the FastAPI dependency (`await session.commit()` after `yield session`) is a popular pattern shown in many tutorials, but it does mean a commit error happens after the response has already been sent. Some teams prefer commits at the service layer instead — worth noting as a stylistic trade-off, not a bug.
- `pool_recycle=1800` (30 minutes) is a sensible default for PostgreSQL behind connection terminators; pool_recycle should be set below any upstream idle-connection timeout (e.g. PgBouncer, AWS RDS Proxy, load balancers).
- The `is_published == True` comparison in `get_published` is intentional for SQLAlchemy expression generation (using `is_` would compare Python identity, not produce the SQL clause). Some linters flag it; this is a known SQLAlchemy idiom.
