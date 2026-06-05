# Validation Summary: How to Fix SQLAlchemy Instrumentation Missing async Engine Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry SQLAlchemy instrumentation
- OpenTelemetry asyncpg instrumentation
- SQLAlchemy asyncio
- Python asyncio
- FastAPI
- PostgreSQL asyncpg

## Sources Consulted
- OpenTelemetry Python Contrib SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python Contrib asyncpg instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncpg/asyncpg.html
- SQLAlchemy asyncio documentation, especially event registration through `sync_engine`: https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html
- OpenTelemetry Python instrumentation documentation for span status and exception recording: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The post said SQLAlchemy async event hooks may not fire correctly because async engines use a different code path. SQLAlchemy's official asyncio docs state async APIs wrap the synchronous core and regular synchronous event handlers are available through `sync_engine`, so the explanation was corrected.
- The post claimed versions `0.42b0` and later have better async support without a source-backed version boundary. This was replaced with current guidance based on the official OpenTelemetry SQLAlchemy docs, which show async usage with `create_async_engine` and `engine.sync_engine`.
- The first code example used `text("SELECT * FROM users")` without importing `text`. Added the missing import.
- The manual event-hook example stored spans on the connection object and used an outdated-looking status call. It now stores the span on SQLAlchemy's per-execution context and uses `Status(StatusCode.ERROR, ...)`, matching OpenTelemetry Python documentation.
- The post referred to `aiosqlite` driver-level OpenTelemetry instrumentation. I could verify official asyncpg instrumentation, but not an official `aiosqlite` instrumentation package, so the section and final recommendation now refer to driver-level instrumentation where available, using asyncpg as the example.
- The complete setup imported `SQLAlchemyInstrumentor` but did not call it, and `app.py` omitted imports for `AsyncSession` and `async_session`. Added the missing instrumentation call and imports.
- The console exporter verification snippet used `SimpleSpanProcessor` and `ConsoleSpanExporter` without imports. Added the imports.

## Review Notes
Using both SQLAlchemy instrumentation and driver-level asyncpg instrumentation can improve coverage, but teams should watch for duplicate database spans in their backend and choose one layer if duplication becomes noisy.
