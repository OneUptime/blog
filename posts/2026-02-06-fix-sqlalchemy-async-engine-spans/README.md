# How to Fix SQLAlchemy Instrumentation Missing async Engine Spans in Python AsyncIO Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SQLAlchemy, Python, AsyncIO

Description: Resolve the issue where OpenTelemetry SQLAlchemy instrumentation does not capture spans from async engine queries in Python apps.

The OpenTelemetry SQLAlchemy instrumentation was originally built for synchronous SQLAlchemy engines. When you use SQLAlchemy's `create_async_engine` with asyncio, the instrumentation may not capture database spans. This post covers how to get tracing working with SQLAlchemy's async API.

## The Problem

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

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

The `opentelemetry-instrumentation-sqlalchemy` package hooks into SQLAlchemy's synchronous event system (`before_cursor_execute`, `after_cursor_execute`). The async engine uses a different code path that wraps a synchronous engine internally, but the event hooks may not fire correctly in the async context.

## Fix 1: Update to the Latest Instrumentation Version

Newer versions of `opentelemetry-instrumentation-sqlalchemy` have improved async support:

```bash
pip install --upgrade opentelemetry-instrumentation-sqlalchemy
```

Check the version:

```bash
pip show opentelemetry-instrumentation-sqlalchemy
```

Versions 0.42b0 and later have better support for async engines.

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
    # Store span on the connection for the after hook
    if not hasattr(conn, '_otel_spans'):
        conn._otel_spans = []
    conn._otel_spans.append(span)

@event.listens_for(async_engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    if hasattr(conn, '_otel_spans') and conn._otel_spans:
        span = conn._otel_spans.pop()
        span.end()

@event.listens_for(async_engine.sync_engine, "handle_error")
def handle_error(exception_context):
    conn = exception_context.connection
    if hasattr(conn, '_otel_spans') and conn._otel_spans:
        span = conn._otel_spans.pop()
        span.set_status(trace.StatusCode.ERROR, str(exception_context.original_exception))
        span.record_exception(exception_context.original_exception)
        span.end()
```

## Fix 4: Use the aiosqlite or asyncpg Instrumentation

For specific async drivers, use driver-level instrumentation:

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
```

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

```python
# app.py
from fastapi import FastAPI, Depends
from sqlalchemy import text

app = FastAPI()

async def get_db():
    async with async_session() as session:
        yield session

@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM users"))
    return result.mappings().all()
    # Now generates a span for the database query
```

## Verifying the Fix

Use the console exporter to verify spans:

```python
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
```

You should see spans like:

```
db.query SELECT * FROM users  [========] 12ms
  db.system: postgresql
  db.name: mydb
  db.statement: SELECT * FROM users
```

The async SQLAlchemy instrumentation story is still maturing. Using the driver-level instrumentation (asyncpg, aiosqlite) alongside the SQLAlchemy instrumentation gives you the most reliable coverage for async database operations.
