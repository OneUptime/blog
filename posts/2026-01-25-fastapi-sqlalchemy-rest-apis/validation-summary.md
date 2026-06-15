# Validation Summary: How to Build REST APIs with FastAPI and SQLAlchemy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- SQLAlchemy async ORM
- PostgreSQL
- asyncpg
- Pydantic
- pydantic-settings
- Alembic
- Uvicorn
- CORS

## Sources Consulted
- FastAPI APIRouter documentation: https://fastapi.tiangolo.com/reference/apirouter/
- FastAPI bigger applications documentation: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- FastAPI CORS documentation: https://fastapi.tiangolo.com/tutorial/cors/
- SQLAlchemy asyncio documentation: https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html
- Alembic asyncio cookbook: https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic
- Alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Pydantic settings documentation: https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/
- Pydantic types / EmailStr documentation: https://pydantic.dev/docs/validation/1.10/usage/types/
- Uvicorn deployment documentation: https://uvicorn.dev/deployment/

## Issues Found
- The installation command omitted `email-validator`, which is required when using Pydantic's `EmailStr`. Added `email-validator` to the `pip install` command.
- The SQLAlchemy async session factory used generic `sessionmaker` with `class_=AsyncSession`. Updated it to `async_sessionmaker`, which is the current SQLAlchemy async helper for creating `AsyncSession` factories.
- The Pydantic settings example used an inner `Config` class. Updated it to `SettingsConfigDict` via `model_config`, matching the current pydantic-settings documentation.
- The CORS example combined `allow_credentials=True` with wildcard origins, methods, and headers. FastAPI's CORS docs require explicit values when credentials are enabled, so the example now lists an explicit local frontend origin, methods, and headers.
- The Alembic async setup used `alembic init alembic` and an incomplete `env.py` snippet that referenced an undefined `do_migrations` function and did not configure the Alembic context. Updated the initialization command to `alembic init -t async alembic` and replaced the snippet with the documented async migration pattern using `async_engine_from_config`, `connection.run_sync()`, `context.configure()`, and engine disposal.

## Review Notes
All Python code blocks were parsed with Python 3.12's `ast` module after edits and passed syntax checks. The tutorial still uses simplified sample defaults such as a placeholder secret key, startup table creation, and SHA-256 password hashing with an inline note to use bcrypt or argon2 in production; these are acceptable for a tutorial sample but should be hardened before being used as production code.
