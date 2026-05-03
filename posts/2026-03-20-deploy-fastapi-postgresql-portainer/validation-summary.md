# Validation Summary: How to Deploy a FastAPI + PostgreSQL Stack via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Portainer (stack deployment)
- FastAPI (Python web framework)
- PostgreSQL 16 (Alpine image)
- SQLAlchemy 2.x with asyncio
- asyncpg (async PostgreSQL driver)
- Alembic (database migrations)
- Uvicorn (ASGI server)
- Docker Compose

## Sources Consulted
- FastAPI documentation: https://fastapi.tiangolo.com/
- FastAPI custom responses: https://fastapi.tiangolo.com/advanced/response-directly/ and https://fastapi.tiangolo.com/advanced/custom-response/
- SQLAlchemy 2.0 migration guide: https://docs.sqlalchemy.org/en/20/changelog/migration_20.html
- SQLAlchemy `text()` construct: https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.text
- SQLAlchemy AsyncEngine docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Uvicorn deployment / `--workers` flag: https://www.uvicorn.org/deployment/
- PostgreSQL `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html
- Official `python:3.12-slim` image (Debian-based, includes bash)
- Docker Compose `depends_on` with `condition: service_healthy`

## Issues Found

1. **Raw SQL string passed to `Connection.execute()`** — In SQLAlchemy 2.0+, raw string SQL is no longer accepted by `Connection.execute()`; it must be wrapped in `sqlalchemy.text()`. The original `await conn.execute("SELECT 1")` would raise `ObjectNotExecutableError` at runtime. Added `from sqlalchemy import text` and changed the call to `await conn.execute(text("SELECT 1"))`.

2. **Flask-style tuple return for HTTP 503** — `return {"status": "unhealthy", ...}, 503` does not work in FastAPI. Unlike Flask, FastAPI does not unpack `(body, status_code)` tuples; it would attempt to serialize the tuple as the response body and the 503 status would be silently dropped. Replaced with an explicit `JSONResponse(status_code=503, content={...})` and added `from fastapi.responses import JSONResponse`.

## Review Notes
- `version: "3.8"` in the Compose file is harmless but considered obsolete by recent Docker Compose versions (the top-level `version` key is now ignored). Left as-is to avoid stylistic changes outside the scope of technical correctness.
- Running `pip install` and `alembic upgrade head` inside the `command:` block on every container start works but is inefficient compared to building a custom image with dependencies pre-installed. Acceptable for a tutorial.
- The post references `alembic upgrade head` but does not show the Alembic configuration files (`alembic.ini`, `env.py`, `versions/`). Readers will need those for the migration step to actually do anything; this is a documentation gap rather than a technical error.
- `--workers 4` with `uvicorn` is valid for production; note it is incompatible with `--reload`, but `--reload` is not used here.
- `python:3.12-slim` (Debian bookworm-slim) does include `bash`, so the `bash -c "..."` command works.
- The asyncpg URL scheme `postgresql+asyncpg://` is correct for SQLAlchemy async engine usage.
