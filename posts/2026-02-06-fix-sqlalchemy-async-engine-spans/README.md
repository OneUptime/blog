# How to Fix SQLAlchemy Instrumentation Missing async Engine Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SQLAlchemy, Python, Asyncio

Description: Resolve the issue where OpenTelemetry SQLAlchemy instrumentation does not capture spans from async engine queries in Python apps.

The OpenTelemetry SQLAlchemy instrumentation was originally built for synchronous SQLAlchemy engines. When you use SQLAlchemy's `create_async_engine` with asyncio, the instrumentation may not capture database spans. This post covers how to get tracing working with SQLAlchemy's async API.

## The Problem

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Async engine - instrumentation may not work

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session = sessionmaker(engine, class_=AsyncSession)

async def get_users():
    async with async_session() as session:
        result = await session.execute(text("SELECT * FROM users"))
        return result.scalars().all()
    # No span generated for the database query!
```

## Why Async Engines Are Not Instrumented

The `opentelemetry-instrumentation-sqlalchemy` package hooks into SQLAlchemy's synchronous event system (`before_cursor_execute`, `after_cursor_execute`). SQLAlchemy's async API wraps the synchronous engine internally, so async calls still pass through the synchronous core where those event hooks run. Missing spans are usually caused by an older instrumentation version, instrumenting after the engine was created without passing the engine explicitly, or instrumenting the `AsyncEngine` instead of the underlying synchronous engine.

## Fix 1: Update to the Latest Instrumentation Version

Current versions of `opentelemetry-instrumentation-sqlalchemy` support SQLAlchemy's async engine path:

```bash
pip install --upgrade opentelemetry-instrumentation-sqlalchemy
```

Check the version:

```bash
pip show opentelemetry-instrumentation-sqlalchemy
```

The current documentation shows async usage with `create_async_engine` and `engine.sync_engine`, so upgrade before trying lower-level workarounds.

## Fix 2: Instrument the Sync Engine Inside the Async Engine

SQLAlchemy's async engine wraps a sync engine. You can instrument the sync engine directly:

```python
from sqlalchemy.ext.asyncio import create_async_engine
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Create the async engine
async_engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")

# Instrument the underlying sync engine
SQLAlchemyInstrumentor().instrument(
    engine=async_engine.sync_engine,
)
```

The `sync_engine` property gives you access to the underlying synchronous engine, which the instrumentation can hook into.

## Fix 3: Use the Engine Event Hook Directly

If the instrumentation package does not work with your async engine version, add tracing manually using SQLAlchemy events:

```python
from sqlalchemy import event
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer("sqlalchemy")

@event.listens_for(async_engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    span = tracer.start_span(
        "db.query",
        attributes={
            "db.system": "postgresql",
            "db.statement": statement[:1000],  # Truncate long queries
            "db.name": conn.engine.url.database,
        },
    )
    # Store span on the SQLAlchemy execution context for the after hook
    context._otel_span = span

@event.listens_for(async_engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    span = getattr(context, "_otel_span", None)
    if span is not None:
        span.end()

@event.listens_for(async_engine.sync_engine, "handle_error")
def handle_error(exception_context):
    context = exception_context.execution_context
    span = getattr(context, "_otel_span", None) if context is not None else None
    if span is not None:
        span.set_status(Status(StatusCode.ERROR, str(exception_context.original_exception)))
        span.record_exception(exception_context.original_exception)
        span.end()
```

## Fix 4: Use the asyncpg Instrumentation

For specific async drivers, use driver-level instrumentation where available:

```bash
# For asyncpg (PostgreSQL)
pip install opentelemetry-instrumentation-asyncpg
```

```python
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor

AsyncPGInstrumentor().instrument()
```

This instruments at the driver level, catching all queries regardless of whether they come through SQLAlchemy's sync or async engine.

## Complete Async Setup

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor

resource = Resource.create({SERVICE_NAME: "async-api"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument asyncpg at the driver level
AsyncPGInstrumentor().instrument()

# Instrument SQLAlchemy before engines are created
SQLAlchemyInstrumentor().instrument()
```

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

```python
# app.py
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session

app = FastAPI()

async def get_db():
    async with async_session() as session:
        yield session

@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM users"))
    # Now generates a span for the database query
    return result.mappings().all()
```

## Verifying the Fix

Use the console exporter to verify spans:

```python
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
```

You should see spans like:

```text
db.query SELECT * FROM users  [========] 12ms
  db.system: postgresql
  db.name: mydb
  db.statement: SELECT * FROM users
```

The async SQLAlchemy instrumentation story is still maturing. Using driver-level instrumentation where available, such as asyncpg, alongside the SQLAlchemy instrumentation gives you the most reliable coverage for async database operations.
