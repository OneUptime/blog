# Validation Summary: How to Create REST APIs with FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- Pydantic
- Uvicorn
- OAuth2 and JWT
- python-jose
- passlib bcrypt hashing
- SQLAlchemy async ORM
- OpenAPI, Swagger UI, and ReDoc

## Sources Consulted
- FastAPI official tutorial: https://fastapi.tiangolo.com/tutorial/
- FastAPI security tutorial for OAuth2 and JWT: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- FastAPI bigger applications and APIRouter docs: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- FastAPI reference for APIRouter: https://fastapi.tiangolo.com/reference/apirouter/
- Pydantic v2 migration guide: https://docs.pydantic.dev/latest/migration/
- Pydantic v2 validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic v2 model serialization documentation: https://docs.pydantic.dev/latest/concepts/serialization/
- Pydantic configuration documentation: https://docs.pydantic.dev/latest/api/config/
- SQLAlchemy asyncio documentation: https://docs.sqlalchemy.org/en/latest/orm/extensions/asyncio.html
- SQLAlchemy sessionmaker documentation: https://docs.sqlalchemy.org/en/latest/orm/session_api.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Updated Pydantic v1-style APIs to current Pydantic v2 APIs: replaced `@validator` with `@field_validator`, `.dict()` with `.model_dump()`, and `orm_mode = True` with `ConfigDict(from_attributes=True)`.
- Added missing imports needed by the examples, including `datetime`, `timezone`, `FastAPI`, SQLAlchemy `Session`, and async database dependencies.
- Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` because `utcnow()` is deprecated as of Python 3.12 and returns a naive datetime.
- Updated the async SQLAlchemy session factory from generic `sessionmaker(..., class_=AsyncSession)` to `async_sessionmaker`, matching current SQLAlchemy async documentation.
- Added query validation to the dependency-injected pagination class with `Query(ge=..., le=...)`, so invalid negative or oversized pagination values are rejected by FastAPI instead of being silently accepted.
- Replaced a SQLAlchemy column truthiness check with `column is not None`, because SQLAlchemy expressions should not be evaluated as booleans.

## Review Notes
The authentication and database examples remain illustrative and depend on application-specific functions and models such as `authenticate_user`, `get_user_from_db`, `SessionLocal`, and `Item`. Those placeholders are acceptable for the scope of the post, but a future expanded tutorial should show their implementations or label them explicitly as existing application code.
