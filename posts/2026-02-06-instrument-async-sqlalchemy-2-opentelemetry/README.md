# How to Instrument Async SQLAlchemy 2.0 with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SQLAlchemy, Async, Python, Database, asyncio

Description: Complete guide to instrumenting async SQLAlchemy 2.0 applications with OpenTelemetry for tracing asynchronous database operations and monitoring performance in modern Python applications.

SQLAlchemy 2.0 introduced first-class support for asyncio, enabling truly asynchronous database operations. Instrumenting these async operations with OpenTelemetry requires understanding both the async execution model and how tracing context propagates through awaited coroutines. This guide shows you how to get complete visibility into your async database layer.

## Why Async SQLAlchemy Matters

Traditional synchronous database operations block the entire thread while waiting for results. In high-concurrency applications, this wastes resources. Async SQLAlchemy allows your application to handle other requests while waiting for database responses, dramatically improving throughput.

However, this concurrency makes debugging harder. Without proper tracing, you lose visibility into which operations are slow, which queries run in parallel, and where bottlenecks occur. OpenTelemetry solves this by tracking each async operation's lifecycle.

## Installing Dependencies

Install SQLAlchemy 2.0+ with async support, OpenTelemetry instrumentation, and an async database driver.

```bash
pip install 'sqlalchemy[asyncio]>=2.0' \
    opentelemetry-api \
    opentelemetry-sdk \
    opentelemetry-instrumentation-sqlalchemy \
    opentelemetry-exporter-otlp \
    aiopg \
    asyncpg
```

Note that you need an async-capable database driver. For PostgreSQL, `asyncpg` is recommended. For MySQL, use `aiomysql`.

## Setting Up OpenTelemetry

Configure OpenTelemetry with async-compatible exporters and processors.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Define service resource
resource = Resource(attributes={
    "service.name": "async-user-service",
    "service.version": "2.0.0",
    "deployment.environment": "production",
    "runtime": "asyncio"
})

# Create tracer provider
provider = TracerProvider(resource=resource)

# Use BatchSpanProcessor for async-friendly export
# It batches spans and exports them in the background
processor = BatchSpanProcessor(
    OTLPSpanExporter(
        endpoint="http://localhost:4317",
        insecure=True
    ),
    max_queue_size=2048,
    schedule_delay_millis=5000,
    max_export_batch_size=512
)

provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("async.sqlalchemy", "1.0.0")
```

## Creating Async Engine and Session

SQLAlchemy 2.0's async API differs from the sync version. You use `create_async_engine` and `AsyncSession`.

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
from typing import Optional

# Create async engine
# Note the asyncpg driver prefix
engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost:5432/asyncdb",
    echo=False,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Define models using SQLAlchemy 2.0 style
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    posts = relationship("Post", back_populates="author", lazy="selectin")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="posts")
```

## Instrumenting the Async Engine

Instrument your async engine to automatically trace all database operations.

```python
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Instrument the engine before using it
# This works with both sync and async engines
SQLAlchemyInstrumentor().instrument(
    engine=engine.sync_engine,  # Pass the sync engine from async engine
    service="async-user-service",
    enable_commenter=True
)

# Create tables asynchronously
async def create_tables():
    """Create database tables asynchronously"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Initialize database
import asyncio
asyncio.run(create_tables())
```

## Tracing Async CRUD Operations

Async operations require `await` at every I/O point. OpenTelemetry automatically maintains trace context across these await boundaries.

```python
from opentelemetry.trace import Status, StatusCode
from sqlalchemy import select, update, delete

async def create_user(username: str, email: str) -> User:
    """Create a user with async operations and tracing"""
    with tracer.start_as_current_span("create_user") as span:
        span.set_attribute("user.username", username)
        span.set_attribute("user.email", email)

        async with async_session_maker() as session:
            try:
                # Create user
                user = User(username=username, email=email)
                session.add(user)

                # Commit is async
                await session.commit()

                # Refresh to get generated ID
                await session.refresh(user)

                span.set_attribute("user.id", user.id)
                span.set_status(Status(StatusCode.OK))

                return user

            except Exception as e:
                await session.rollback()
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise

async def get_user_by_id(user_id: int) -> Optional[User]:
    """Retrieve user asynchronously"""
    with tracer.start_as_current_span("get_user_by_id") as span:
        span.set_attribute("user.id", user_id)

        async with async_session_maker() as session:
            # SQLAlchemy 2.0 select syntax
            stmt = select(User).where(User.id == user_id)

            # Execute returns Result object
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if user:
                span.set_attribute("user.found", True)
                span.set_attribute("user.username", user.username)
            else:
                span.set_attribute("user.found", False)

            return user

async def update_user_email(user_id: int, new_email: str) -> bool:
    """Update user email asynchronously"""
    with tracer.start_as_current_span("update_user_email") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("user.new_email", new_email)

        async with async_session_maker() as session:
            try:
                # Update statement
                stmt = update(User).where(
                    User.id == user_id
                ).values(email=new_email)

                result = await session.execute(stmt)
                await session.commit()

                # Check if any rows were updated
                success = result.rowcount > 0
                span.set_attribute("update.success", success)
                span.set_attribute("update.rows_affected", result.rowcount)

                return success

            except Exception as e:
                await session.rollback()
                span.record_exception(e)
                raise

async def delete_user(user_id: int) -> bool:
    """Delete user asynchronously"""
    with tracer.start_as_current_span("delete_user") as span:
        span.set_attribute("user.id", user_id)

        async with async_session_maker() as session:
            try:
                stmt = delete(User).where(User.id == user_id)
                result = await session.execute(stmt)
                await session.commit()

                success = result.rowcount > 0
                span.set_attribute("delete.success", success)

                return success

            except Exception as e:
                await session.rollback()
                span.record_exception(e)
                raise
```

## Concurrent Query Execution

One of the main benefits of async SQLAlchemy is executing multiple queries concurrently. OpenTelemetry traces each operation independently.

```python
async def get_multiple_users(user_ids: list[int]) -> list[User]:
    """Fetch multiple users concurrently"""
    with tracer.start_as_current_span("get_multiple_users") as span:
        span.set_attribute("user_ids.count", len(user_ids))

        # Create coroutines for each lookup
        tasks = [get_user_by_id(user_id) for user_id in user_ids]

        # Execute all queries concurrently
        # Each query creates its own span
        users = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and None values
        valid_users = [
            user for user in users
            if isinstance(user, User)
        ]

        span.set_attribute("users.found", len(valid_users))

        return valid_users

async def get_user_with_posts(user_id: int) -> dict:
    """Fetch user and their posts concurrently"""
    with tracer.start_as_current_span("get_user_with_posts") as span:
        span.set_attribute("user.id", user_id)

        async with async_session_maker() as session:
            # Create both queries
            user_stmt = select(User).where(User.id == user_id)
            posts_stmt = select(Post).where(Post.author_id == user_id)

            # Execute concurrently
            user_result, posts_result = await asyncio.gather(
                session.execute(user_stmt),
                session.execute(posts_stmt)
            )

            user = user_result.scalar_one_or_none()
            posts = posts_result.scalars().all()

            if user:
                span.set_attribute("posts.count", len(posts))

                return {
                    "user": user,
                    "posts": posts
                }

            return None
```

## Async Transactions with Tracing

Complex transactions that span multiple operations benefit from detailed tracing.

```python
async def transfer_posts(from_user_id: int, to_user_id: int, post_ids: list[int]):
    """Transfer posts between users in an async transaction"""
    with tracer.start_as_current_span("transfer_posts") as span:
        span.set_attribute("from_user_id", from_user_id)
        span.set_attribute("to_user_id", to_user_id)
        span.set_attribute("post_ids.count", len(post_ids))

        async with async_session_maker() as session:
            async with session.begin():
                # This nested context manager creates a transaction
                with tracer.start_as_current_span("verify_users"):
                    # Verify both users exist
                    user_check = select(User.id).where(
                        User.id.in_([from_user_id, to_user_id])
                    )
                    result = await session.execute(user_check)
                    existing_ids = result.scalars().all()

                    if len(existing_ids) != 2:
                        raise ValueError("One or both users don't exist")

                with tracer.start_as_current_span("verify_ownership"):
                    # Verify from_user owns all posts
                    ownership_check = select(Post.id).where(
                        Post.id.in_(post_ids),
                        Post.author_id == from_user_id
                    )
                    result = await session.execute(ownership_check)
                    owned_posts = result.scalars().all()

                    if len(owned_posts) != len(post_ids):
                        raise ValueError("Source user doesn't own all posts")

                with tracer.start_as_current_span("update_ownership"):
                    # Transfer posts
                    update_stmt = update(Post).where(
                        Post.id.in_(post_ids)
                    ).values(author_id=to_user_id)

                    result = await session.execute(update_stmt)
                    span.set_attribute("posts.transferred", result.rowcount)

                # Transaction commits automatically on exit
```

## Streaming Results with Async

For large result sets, streaming prevents memory exhaustion. Tracing shows how long the stream takes to process.

```python
async def stream_users(batch_size: int = 100):
    """Stream users in batches with tracing"""
    with tracer.start_as_current_span("stream_users") as span:
        span.set_attribute("batch_size", batch_size)

        async with async_session_maker() as session:
            # Create streaming query
            stmt = select(User).execution_options(
                yield_per=batch_size
            )

            # Execute and stream results
            stream = await session.stream(stmt)

            batch_count = 0
            total_users = 0

            async for user in stream.scalars():
                total_users += 1

                # Process each user
                with tracer.start_as_current_span("process_user") as user_span:
                    user_span.set_attribute("user.id", user.id)
                    # Your processing logic here
                    await asyncio.sleep(0.01)  # Simulate work

                if total_users % batch_size == 0:
                    batch_count += 1
                    span.add_event(f"processed_batch_{batch_count}", {
                        "users_processed": total_users
                    })

            span.set_attribute("total_users", total_users)
            span.set_attribute("batches_processed", batch_count)
```

## Connection Pool Monitoring

Monitor async connection pool health to detect exhaustion and leaks.

```python
from opentelemetry import metrics

# Set up metrics
meter_provider = metrics.get_meter_provider()
meter = meter_provider.get_meter("async.sqlalchemy", "1.0.0")

# Create observable gauges for pool metrics
def observe_pool_metrics(options):
    """Observe connection pool state"""
    pool = engine.pool

    # These metrics help detect connection leaks
    yield metrics.Observation(pool.size(), {"pool.metric": "size"})
    yield metrics.Observation(pool.checked_out_connections, {"pool.metric": "checked_out"})
    yield metrics.Observation(pool.overflow(), {"pool.metric": "overflow"})
    yield metrics.Observation(pool.checked_in_connections, {"pool.metric": "checked_in"})

pool_gauge = meter.create_observable_gauge(
    name="db.pool.connections",
    description="Database connection pool metrics",
    callbacks=[observe_pool_metrics]
)

async def monitored_query():
    """Query with connection pool monitoring"""
    with tracer.start_as_current_span("monitored_query") as span:
        # Record pool state before query
        span.set_attribute("pool.size_before", engine.pool.size())
        span.set_attribute("pool.checked_out_before", engine.pool.checked_out_connections)

        async with async_session_maker() as session:
            result = await session.execute(select(User))
            users = result.scalars().all()

            # Record pool state after query
            span.set_attribute("pool.size_after", engine.pool.size())
            span.set_attribute("pool.checked_out_after", engine.pool.checked_out_connections)

            return users
```

## Integration with Async Web Frameworks

Combine async SQLAlchemy with FastAPI for fully traced async web applications.

```python
from fastapi import FastAPI, HTTPException, Depends
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from pydantic import BaseModel

app = FastAPI()

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

class UserCreate(BaseModel):
    username: str
    email: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True

@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user_endpoint(user_data: UserCreate):
    """
    Create user endpoint with full async tracing.
    Trace includes HTTP span -> business logic span -> DB spans.
    """
    try:
        user = await create_user(user_data.username, user_data.email)
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user_endpoint(user_id: int):
    """Get user with async tracing"""
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.get("/users")
async def list_users_endpoint(limit: int = 100):
    """List users with streaming and tracing"""
    with tracer.start_as_current_span("list_users_endpoint") as span:
        span.set_attribute("query.limit", limit)

        async with async_session_maker() as session:
            stmt = select(User).limit(limit)
            result = await session.execute(stmt)
            users = result.scalars().all()

            span.set_attribute("users.count", len(users))

            return [
                UserResponse.from_orm(user)
                for user in users
            ]
```

## Trace Visualization

Understanding async trace structure helps optimize performance:

```mermaid
graph TD
    A[HTTP POST /users] --> B[create_user span]
    B --> C[INSERT user]

    D[HTTP GET /users/batch] --> E[get_multiple_users span]
    E --> F[get_user_by_id span 1]
    E --> G[get_user_by_id span 2]
    E --> H[get_user_by_id span 3]

    F --> I[SELECT user 1]
    G --> J[SELECT user 2]
    H --> K[SELECT user 3]

    style I fill:#90EE90
    style J fill:#90EE90
    style K fill:#90EE90

    L[Note: Spans F, G, H execute concurrently]
```

## Best Practices

**Always Use Async Context Managers**: Use `async with` for sessions and connections to ensure proper cleanup and trace completion.

**Batch Operations**: When possible, batch multiple operations into fewer queries. Trace the batch as a single span with attributes for item count.

**Monitor Connection Pools**: Async applications can quickly exhaust connection pools. Monitor pool metrics and adjust pool_size accordingly.

**Avoid Blocking Calls**: Never use synchronous SQLAlchemy methods in async code. This blocks the event loop and defeats the purpose of async.

**Set Appropriate Timeouts**: Add query timeouts to prevent long-running queries from blocking your application.

**Use Sampling in High Traffic**: For services handling thousands of requests per second, use trace sampling to reduce overhead.

## Conclusion

Instrumenting async SQLAlchemy 2.0 with OpenTelemetry provides complete visibility into your asynchronous database operations. You can trace concurrent queries, monitor connection pool health, and debug complex async workflows with confidence. This observability is essential for building reliable, high-performance async Python applications.
