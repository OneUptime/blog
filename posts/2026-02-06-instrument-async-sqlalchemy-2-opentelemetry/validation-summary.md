# Validation Summary: How to Instrument Async SQLAlchemy 2.0 with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- asyncio
- SQLAlchemy 2.0 async ORM
- OpenTelemetry Python tracing and metrics
- OpenTelemetry SQLAlchemy instrumentation
- OpenTelemetry FastAPI instrumentation
- PostgreSQL asyncpg driver
- FastAPI
- Pydantic v2

## Sources Consulted
- SQLAlchemy 2.0 asyncio documentation: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- SQLAlchemy 2.0 session concurrency documentation: https://docs.sqlalchemy.org/en/20/orm/session_basics.html
- SQLAlchemy 2.0 connection pooling documentation: https://docs.sqlalchemy.org/en/20/core/pooling.html
- OpenTelemetry Python SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Pydantic v2 migration documentation: https://pydantic.dev/docs/validation/2.7/get-started/migration/

## Issues Found
- The introduction said SQLAlchemy 2.0 introduced asyncio support. SQLAlchemy added asyncio support before 2.0, so this was changed to say SQLAlchemy 2.0 provides first-class asyncio support.
- The dependency installation command imported FastAPI instrumentation later but did not install `opentelemetry-instrumentation-fastapi`. Added the missing package and removed the unused `aiopg` package from the PostgreSQL asyncpg example.
- The `get_user_with_posts` example ran two concurrent `session.execute()` calls against the same `AsyncSession`. SQLAlchemy documents that an `AsyncSession` is not safe to share across concurrent tasks, so the example now uses one independent session per concurrent task.
- The same function could return `None` but was annotated as returning `dict`. Updated the annotation to `Optional[dict]`.
- The connection pool monitoring example used non-existent `checked_out_connections` and `checked_in_connections` attributes. Updated it to use the SQLAlchemy pool methods `checkedout()` and `checkedin()`.
- The metrics callback used `metrics.Observation`; updated it to import and use `Observation` from `opentelemetry.metrics`, matching the official Python metrics API examples.
- The FastAPI/Pydantic example used Pydantic v1-style `Config` and deprecated `from_orm()`. Updated it to Pydantic v2 `ConfigDict(from_attributes=True)` and `model_validate()`.
- The FastAPI example imported `Depends` but did not use it. Removed the unused import.

## Review Notes
The metrics snippet assumes a metrics SDK provider and exporter have already been configured elsewhere; the post only shows trace exporter setup. This is acceptable for a focused pool-gauge example, but a future revision could add a full metrics exporter setup if the article wants end-to-end metric export.
