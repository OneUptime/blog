# Validation Summary: How to Build a REST API with MySQL and Python FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python FastAPI
- MySQL
- SQLAlchemy 2.0+ (async engine, `async_sessionmaker`, `DeclarativeBase`, `Mapped`/`mapped_column`)
- asyncmy (async MySQL driver)
- Pydantic v2 (schemas with `from_attributes`)
- Uvicorn (ASGI server)

## Sources Consulted
- FastAPI official documentation — https://fastapi.tiangolo.com/
- SQLAlchemy 2.0 async documentation — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- SQLAlchemy `create_async_engine` API reference — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html#sqlalchemy.ext.asyncio.create_async_engine
- SQLAlchemy connection pool configuration — https://docs.sqlalchemy.org/en/20/core/pooling.html
- SQLAlchemy `Numeric` type documentation — https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.Numeric
- Pydantic v2 model configuration — https://docs.pydantic.dev/latest/concepts/config/
- asyncmy PyPI page — https://pypi.org/project/asyncmy/
- Uvicorn deployment documentation — https://www.uvicorn.org/deployment/

## Issues Found

1. **Redundant `aiomysql` dependency**: The pip install command included both `asyncmy` and `aiomysql`, but the database URL uses the `mysql+asyncmy://` dialect, so only `asyncmy` is needed. Removed `aiomysql` from the install command.

2. **Incorrect type annotation on `total` field**: The Order model used `Mapped[float]` for a `Numeric(10, 2)` column. SQLAlchemy's `Numeric` type returns `Decimal` objects at runtime, and the Pydantic schema already used `Decimal`. Changed to `Mapped[Decimal]` and added the `from decimal import Decimal` import to the models file.

3. **Broken health check endpoint**: The health check used `engine.dialect.statement_compiler(None, None)` as a SQL statement to execute. `statement_compiler` is an internal compiler class, not an executable statement — this would raise an error at runtime. Replaced with `text("SELECT 1")`, the standard way to perform a database liveness check, and added the `from sqlalchemy import text` import.

4. **Incorrect error response pattern**: The health check's except branch returned `{'status': 'error'}, 503` as a tuple. FastAPI does not support Flask-style tuple responses for setting status codes — this would either fail to serialize or return HTTP 200 with unexpected content. Replaced with `JSONResponse(content={'status': 'error'}, status_code=503)` and added the `from fastapi.responses import JSONResponse` import.

5. **Inaccurate description of `pool_pre_ping`**: The summary stated that `pool_pre_ping=True` "ensures stale connections are recycled automatically." `pool_pre_ping` tests (pings) connections before checkout and invalidates stale ones; it does not recycle them on a schedule (that is `pool_recycle`). Updated the wording to accurately describe the behavior.

## Review Notes
- The Pydantic schema uses `class Config: from_attributes = True`, which works in Pydantic v2 for backwards compatibility. The modern Pydantic v2 approach is `model_config = ConfigDict(from_attributes=True)`. Both are valid; no change made.
- The `get_db` dependency yields a session but does not explicitly commit or rollback on exit. This works because `async_sessionmaker` with the context manager (`async with`) will automatically close the session. For routes that modify data, the explicit `await db.commit()` in the router handles persistence. This is a valid pattern.
- The `--workers 4` flag with uvicorn spawns multiple processes. Each worker creates its own async engine instance (due to module-level creation), which is the correct behavior for process-based concurrency with async SQLAlchemy.
