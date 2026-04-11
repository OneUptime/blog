# Validation Summary: How to Use MySQL with FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- FastAPI
- SQLAlchemy 2.0 (async engine, DeclarativeBase, Mapped types)
- aiomysql (async MySQL driver)
- Alembic (schema migrations)
- python-dotenv
- Pydantic (implicit via FastAPI)

## Sources Consulted
- SQLAlchemy 2.0 documentation on Mapped Column Declarations: https://docs.sqlalchemy.org/en/20/orm/mapped_attributes.html
- SQLAlchemy 2.0 async session documentation: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- FastAPI dependency injection documentation: https://fastapi.tiangolo.com/tutorial/dependencies/
- Alembic documentation on async migrations: https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic

## Issues Found

### Issue 1: Incorrect `Mapped` type annotation for `created_at`
- **What was wrong:** The model used `Mapped[DateTime]` where `DateTime` is `sqlalchemy.DateTime`, a SQLAlchemy column type. SQLAlchemy 2.0's `Mapped` annotations expect Python types (e.g., `int`, `str`, `datetime`), not SQLAlchemy column types. Using `Mapped[DateTime]` would raise a type resolution error at class definition time.
- **What was changed:** Replaced `Mapped[DateTime]` with `Mapped[datetime]` using Python's `datetime.datetime`. Updated imports accordingly: added `from datetime import datetime` and removed the unused `DateTime` import from `sqlalchemy`.
- **Why:** SQLAlchemy 2.0 automatically maps `datetime` (Python type) to `DateTime` (SQL type). The `Mapped` type parameter must be a Python type.

### Issue 2: Alembic `init` command missing async template flag
- **What was wrong:** The post used `alembic init alembic`, which generates a synchronous migration environment. Since the entire post uses async SQLAlchemy (`create_async_engine`, `AsyncSession`), the default sync Alembic template would not work with the async engine without significant manual modification of `env.py`.
- **What was changed:** Changed `alembic init alembic` to `alembic init -t async alembic` to use Alembic's built-in async template.
- **Why:** The `-t async` flag generates an `env.py` that uses `run_async()` and is compatible with async SQLAlchemy engines out of the box.

## Review Notes
- The post installs `python-dotenv` but never calls `load_dotenv()` in the code. The environment variables section shows values that could be set as shell environment variables, so this is not technically wrong, but readers using a `.env` file would need to add `from dotenv import load_dotenv; load_dotenv()` to `database.py`.
- The `AsyncSession` import in `database.py` is unused (it's imported again where needed in other files). Not harmful, but could be removed for cleanliness.
- The `POST /users` endpoint takes `name` and `email` as query parameters. In production, these would typically be received as a Pydantic request body model. This is a simplification for the tutorial and is functionally correct.
