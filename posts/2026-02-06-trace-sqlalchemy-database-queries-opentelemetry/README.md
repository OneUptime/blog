# How to Trace SQLAlchemy Database Queries with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SQLAlchemy, Python, Database, SQL, Query Tracing

Description: Comprehensive guide to tracing SQLAlchemy database queries with OpenTelemetry for monitoring query performance, detecting N+1 problems, and optimizing database interactions.

Database queries are often the bottleneck in web applications, but identifying which queries are slow and why can be challenging. OpenTelemetry's automatic instrumentation for SQLAlchemy captures detailed traces of every database operation, giving you visibility into query patterns, execution times, and potential optimizations.

## Why Trace Database Queries

Without query tracing, you're flying blind when database performance degrades. Common issues that tracing reveals include:

- Slow queries that exceed acceptable response times
- N+1 query problems where you execute hundreds of queries instead of one
- Missing indexes causing full table scans
- Lock contention and transaction conflicts
- Connection pool exhaustion

OpenTelemetry traces show you exactly which queries run, how long they take, and how they relate to your application code.

## Installing Dependencies

Start by installing OpenTelemetry with SQLAlchemy instrumentation support.

```bash
pip install opentelemetry-api opentelemetry-sdk \
    opentelemetry-instrumentation-sqlalchemy \
    opentelemetry-exporter-otlp \
    sqlalchemy
```

For this example, we'll also install a database driver. PostgreSQL is used here, but the instrumentation works with any SQLAlchemy-supported database.

```bash
pip install psycopg2-binary
```

## Basic Setup

Configure OpenTelemetry tracing with automatic SQLAlchemy instrumentation. This captures all queries without modifying your application code.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Define your service information
resource = Resource(attributes={
    "service.name": "user-service",
    "service.version": "1.0.0",
    "deployment.environment": "production"
})

# Create and configure the tracer provider
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True
))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Get a tracer for manual instrumentation
tracer = trace.get_tracer("sqlalchemy.app", "1.0.0")
```

## Instrumenting SQLAlchemy

The SQLAlchemy instrumentor automatically wraps engine creation to capture all database operations.

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Create your database engine
engine = create_engine(
    "postgresql://user:password@localhost:5432/mydb",
    echo=False,  # Set to True for SQL logging
    pool_size=10,
    max_overflow=20
)

# Instrument SQLAlchemy BEFORE creating sessions
# This enables automatic tracing for all queries
SQLAlchemyInstrumentor().instrument(
    engine=engine,
    service="user-service",
    enable_commenter=True,  # Adds trace context to SQL comments
)

# Create session factory
Session = sessionmaker(bind=engine)

# Define your models
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), nullable=False)
    posts = relationship("Post", back_populates="author")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User", back_populates="posts")

# Create tables
Base.metadata.create_all(engine)
```

## Tracing CRUD Operations

With instrumentation enabled, every query automatically creates spans with detailed information.

```python
from opentelemetry.trace import Status, StatusCode

def create_user(username: str, email: str) -> User:
    """Create a new user with tracing"""
    # Manual span for the business operation
    with tracer.start_as_current_span("create_user") as span:
        span.set_attribute("user.username", username)
        span.set_attribute("user.email", email)

        session = Session()
        try:
            # This INSERT query is automatically traced
            user = User(username=username, email=email)
            session.add(user)
            session.commit()

            span.set_attribute("user.id", user.id)
            span.set_status(Status(StatusCode.OK))

            return user
        except Exception as e:
            session.rollback()
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
        finally:
            session.close()

def get_user_by_id(user_id: int) -> User:
    """Retrieve a user by ID with tracing"""
    with tracer.start_as_current_span("get_user_by_id") as span:
        span.set_attribute("user.id", user_id)

        session = Session()
        try:
            # SELECT query is automatically traced
            user = session.query(User).filter(User.id == user_id).first()

            if user:
                span.set_attribute("user.found", True)
                span.set_attribute("user.username", user.username)
            else:
                span.set_attribute("user.found", False)

            return user
        finally:
            session.close()

def update_user_email(user_id: int, new_email: str):
    """Update user email with tracing"""
    with tracer.start_as_current_span("update_user_email") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("user.new_email", new_email)

        session = Session()
        try:
            # SELECT followed by UPDATE, both traced
            user = session.query(User).filter(User.id == user_id).first()

            if user:
                user.email = new_email
                session.commit()
                span.set_attribute("update.success", True)
            else:
                span.set_attribute("update.success", False)
                span.add_event("user_not_found", {"user.id": user_id})
        finally:
            session.close()
```

## Detecting N+1 Query Problems

N+1 problems occur when you load a collection and then query for related data in a loop. Tracing makes these issues obvious.

```python
def get_users_with_posts_bad():
    """Example of N+1 problem - AVOID THIS"""
    with tracer.start_as_current_span("get_users_with_posts_bad") as span:
        session = Session()
        try:
            # One query to get all users
            users = session.query(User).all()
            span.set_attribute("users.count", len(users))

            results = []
            for user in users:
                # N queries (one per user) to get posts - BAD!
                # Each of these creates a separate traced span
                posts = session.query(Post).filter(Post.author_id == user.id).all()
                results.append({
                    "user": user.username,
                    "post_count": len(posts)
                })

            # Your trace will show 1 + N database calls
            span.set_attribute("query.pattern", "n_plus_one")

            return results
        finally:
            session.close()

def get_users_with_posts_good():
    """Optimized version using eager loading"""
    with tracer.start_as_current_span("get_users_with_posts_good") as span:
        session = Session()
        try:
            from sqlalchemy.orm import joinedload

            # Single query with JOIN to get users and their posts
            users = session.query(User).options(joinedload(User.posts)).all()
            span.set_attribute("users.count", len(users))

            results = []
            for user in users:
                # No additional queries - data is already loaded
                results.append({
                    "user": user.username,
                    "post_count": len(user.posts)
                })

            # Your trace shows just 1 optimized database call
            span.set_attribute("query.pattern", "optimized_join")

            return results
        finally:
            session.close()
```

## Adding Custom Span Attributes

Enhance traces with application-specific context to make debugging easier.

```python
from typing import List, Optional

def search_posts(keyword: str, limit: int = 10) -> List[Post]:
    """Search posts with rich tracing context"""
    with tracer.start_as_current_span("search_posts") as span:
        # Add search parameters as attributes
        span.set_attribute("search.keyword", keyword)
        span.set_attribute("search.limit", limit)

        session = Session()
        try:
            # Query with LIKE pattern
            query = session.query(Post).filter(
                Post.title.contains(keyword) | Post.content.contains(keyword)
            ).limit(limit)

            # Add query explanation plan as event
            if hasattr(query.statement, 'compile'):
                compiled = query.statement.compile(
                    compile_kwargs={"literal_binds": True}
                )
                span.add_event("query_compiled", {
                    "sql": str(compiled)
                })

            results = query.all()

            # Record results
            span.set_attribute("search.results_count", len(results))

            if len(results) == limit:
                span.add_event("results_limited", {
                    "message": "More results may exist"
                })

            return results
        finally:
            session.close()
```

## Transaction Tracing

Trace complex transactions to understand their scope and duration.

```python
from sqlalchemy.orm import Session as SessionType

def transfer_post_ownership(
    post_id: int,
    from_user_id: int,
    to_user_id: int
) -> bool:
    """Transfer post ownership in a traced transaction"""
    with tracer.start_as_current_span("transfer_post_ownership") as span:
        span.set_attribute("post.id", post_id)
        span.set_attribute("transfer.from_user", from_user_id)
        span.set_attribute("transfer.to_user", to_user_id)

        session = Session()
        try:
            # Start explicit transaction span
            with tracer.start_as_current_span("database_transaction"):
                # Verify source user owns the post
                post = session.query(Post).filter(
                    Post.id == post_id,
                    Post.author_id == from_user_id
                ).first()

                if not post:
                    span.set_attribute("transfer.result", "post_not_found")
                    return False

                # Verify target user exists
                target_user = session.query(User).filter(
                    User.id == to_user_id
                ).first()

                if not target_user:
                    span.set_attribute("transfer.result", "target_user_not_found")
                    return False

                # Update ownership
                post.author_id = to_user_id
                session.commit()

                span.set_attribute("transfer.result", "success")
                return True

        except Exception as e:
            session.rollback()
            span.record_exception(e)
            span.set_attribute("transfer.result", "error")
            raise
        finally:
            session.close()
```

## Monitoring Query Performance

Create custom spans to measure and alert on slow queries.

```python
import time
from contextlib import contextmanager

class QueryPerformanceMonitor:
    def __init__(self, tracer, slow_query_threshold_ms: float = 100.0):
        self.tracer = tracer
        self.threshold_ms = slow_query_threshold_ms

    @contextmanager
    def monitor_query(self, operation_name: str):
        """Context manager to monitor query performance"""
        with self.tracer.start_as_current_span(f"db.{operation_name}") as span:
            start_time = time.perf_counter()

            try:
                yield span
            finally:
                duration_ms = (time.perf_counter() - start_time) * 1000
                span.set_attribute("db.duration_ms", duration_ms)

                # Flag slow queries
                if duration_ms > self.threshold_ms:
                    span.set_attribute("db.slow_query", True)
                    span.add_event("slow_query_detected", {
                        "threshold_ms": self.threshold_ms,
                        "actual_ms": duration_ms
                    })

# Usage
monitor = QueryPerformanceMonitor(tracer, slow_query_threshold_ms=50.0)

def get_user_stats(user_id: int) -> dict:
    """Get user statistics with performance monitoring"""
    with monitor.monitor_query("get_user_stats") as span:
        session = Session()
        try:
            span.set_attribute("user.id", user_id)

            # Complex aggregation query
            from sqlalchemy import func

            post_count = session.query(func.count(Post.id)).filter(
                Post.author_id == user_id
            ).scalar()

            span.set_attribute("user.post_count", post_count)

            return {
                "user_id": user_id,
                "post_count": post_count
            }
        finally:
            session.close()
```

## Trace Context Propagation

When your application receives distributed trace context from upstream services, propagate it through database operations.

```python
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

def handle_request(headers: dict, user_id: int):
    """Handle request with distributed trace context"""
    # Extract trace context from incoming headers
    propagator = TraceContextTextMapPropagator()
    context = propagator.extract(headers)

    # Use the extracted context for this operation
    with tracer.start_as_current_span(
        "handle_user_request",
        context=context
    ) as span:
        span.set_attribute("http.user_id", user_id)

        # Database operations will be child spans of this request
        user = get_user_by_id(user_id)

        if user:
            # All these queries appear in the same distributed trace
            posts = get_users_with_posts_good()

        return {"status": "success"}
```

## Trace Visualization

Understanding the trace hierarchy helps identify bottlenecks:

```mermaid
graph TD
    A[HTTP Request] --> B[handle_user_request]
    B --> C[get_user_by_id]
    C --> D[SQL: SELECT users]

    B --> E[get_users_with_posts_good]
    E --> F[SQL: SELECT users JOIN posts]

    B --> G[search_posts]
    G --> H[SQL: SELECT posts WHERE ...]

    style D fill:#90EE90
    style F fill:#90EE90
    style H fill:#FFB6C6
```

## Best Practices

**Enable SQL Commenter**: Add trace IDs to SQL queries as comments so you can correlate database logs with traces.

**Set Meaningful Span Names**: Use descriptive operation names like "create_user" instead of generic names like "database_operation".

**Add Business Context**: Include user IDs, entity IDs, and operation types as span attributes.

**Monitor Connection Pools**: Track connection pool metrics alongside query traces to detect exhaustion.

**Sample in Production**: For high-traffic services, use sampling to reduce overhead while maintaining visibility.

**Correlate with Slow Query Logs**: Cross-reference OpenTelemetry traces with your database's slow query log.

## Troubleshooting Common Issues

**Missing Traces**: Ensure you instrument the engine before creating sessions. Instrumenting after sessions exist won't capture their queries.

**Incomplete Context**: If child spans don't appear in traces, verify you're using the same trace provider throughout your application.

**High Overhead**: Reduce batch size or increase export interval if tracing impacts performance.

**Sensitive Data**: Be careful not to log sensitive data in span attributes. Filter parameters before adding them to traces.

## Conclusion

Tracing SQLAlchemy queries with OpenTelemetry gives you unprecedented visibility into database performance. You can identify slow queries, detect N+1 problems, and understand exactly how your application interacts with the database. This observability is essential for maintaining performance as your application scales and evolves.
