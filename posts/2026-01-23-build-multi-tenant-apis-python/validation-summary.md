# Validation Summary: How to Build Multi-Tenant APIs in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- Starlette middleware
- SQLAlchemy ORM
- Pydantic
- Redis rate limiting
- Pytest / FastAPI TestClient
- Multi-tenant SaaS API architecture

## Sources Consulted
- FastAPI dependency reference: https://fastapi.tiangolo.com/reference/dependencies/
- FastAPI advanced dependencies: https://fastapi.tiangolo.com/advanced/advanced-dependencies/
- FastAPI middleware tutorial: https://fastapi.tiangolo.com/tutorial/middleware/
- Starlette middleware documentation: https://starlette.dev/middleware/
- SQLAlchemy declarative table configuration: https://docs.sqlalchemy.org/en/latest/orm/declarative_tables.html
- SQLAlchemy legacy Query API documentation: https://docs.sqlalchemy.org/en/latest/orm/queryguide/query.html
- Pydantic v2 migration guide: https://pydantic.dev/docs/latest/migration/
- Pydantic BaseModel API: https://pydantic.dev/docs/latest/api/base_model/
- Pydantic ORM examples: https://pydantic.dev/docs/latest/examples/orms/
- Redis INCR command and rate limiter pattern: https://redis.io/docs/latest/commands/incr/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The `TenantContext` dataclass did not include `is_active`, but the middleware checked `tenant.is_active`. Added the field and populated it from the tenant record.
- The middleware returned hand-built JSON strings and interpolated exception details into JSON. Replaced these with `JSONResponse` to produce valid JSON safely.
- The middleware snippet referenced tenant context, database, and cache objects without showing how they were supplied. Added imports for tenant context and passed `db` and `cache` into the middleware instance.
- The database example used SQLAlchemy's old declarative import and legacy `Session.query()` / `Query` API. Updated the snippet to SQLAlchemy 2.x-style `DeclarativeBase`, `Mapped`, `mapped_column`, `select()`, and `delete()`.
- The route example used `Optional` and `Session` without importing them. Added the missing imports.
- The route handlers were declared `async` while using synchronous SQLAlchemy `Session` operations. Changed them to regular `def` handlers to match FastAPI's supported pattern for blocking sync work.
- The Pydantic response model returned SQLAlchemy ORM objects without enabling attribute-based model population. Added `model_config = {"from_attributes": True}`.
- The rate limiter used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- The rate-limit middleware raised `HTTPException` from middleware. Changed it to return a `JSONResponse` with the correct 429 headers.
- The tenant settings example used a mutable default dictionary and Pydantic v1-style `.dict()`. Replaced the default with `Field(default_factory=dict)` and `.dict()` with `.model_dump()`.
- The tenant settings defaults were reused as shared model instances. Added `model_copy(deep=True)` before applying tenant-specific overrides.
- The parameterized FastAPI dependency `require_feature()` was declared `async`, causing `Depends(require_feature(...))` to receive a coroutine instead of a callable dependency. Changed it to a regular function that returns the async dependency callable.
- The feature-check snippet referenced FastAPI objects and `get_config_service` without defining them. Added the relevant imports, a `get_config_service` dependency, and an `APIRouter` for the usage example.

## Review Notes
- The code examples remain illustrative and assume application-specific implementations for tenant lookup, JWT decoding, database connection setup, and cache initialization.
- The Redis fixed-window limiter pattern is valid for a simple example, but high-concurrency production systems may prefer Lua scripts or Redis transactions to make multi-command limiter updates atomic.
- All Python code blocks in the final post were parsed with `ast.parse()` successfully.
