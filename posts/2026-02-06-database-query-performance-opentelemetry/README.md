# How to Use OpenTelemetry for Database Query Performance Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Database, Performance, SQL, Query Optimization, Tracing, Observability

Description: Learn how to use OpenTelemetry tracing and metrics to identify slow database queries, optimize query performance, and build a comprehensive database observability practice.

---

Slow database queries are behind a huge number of production performance issues. The tricky part is finding them. Your application might run hundreds of different queries, and the slow ones only show up under specific conditions or data volumes.

OpenTelemetry gives you the tools to capture detailed information about every database call your application makes. With the right instrumentation, you can see exactly which queries are slow, how often they run, and how they contribute to overall request latency. This turns database optimization from a guessing game into a systematic process.

This guide covers how to instrument your application for database observability, what metrics to collect, and how to use that data to find and fix performance problems.

---

## How OpenTelemetry Captures Database Activity

```mermaid
flowchart LR
    App["Application"] --> ORM["ORM/Driver<br/>(Instrumented)"]
    ORM --> DB["Database"]
    ORM --> Spans["DB Spans<br/>(query, duration, params)"]
    Spans --> Collector["OTel Collector"]
    Collector --> Backend["Observability Backend"]
```

OpenTelemetry auto-instrumentation libraries hook into your database driver or ORM to create spans for every query. Each span captures the query text, execution time, database system, and other relevant attributes.

---

## Setting Up Database Instrumentation

### Python with SQLAlchemy

Most Python applications use SQLAlchemy or a similar ORM. The OpenTelemetry SQLAlchemy instrumentation library captures spans for every query automatically.

```python
# db_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from sqlalchemy import create_engine

# Configure the tracer provider
resource = Resource.create({SERVICE_NAME: "order-service"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="https://otel.oneuptime.com/v1/traces")
    )
)
trace.set_tracer_provider(provider)

# Create the database engine
engine = create_engine(
    "postgresql://user:password@localhost:5432/orders",
    pool_size=20,
    max_overflow=5,
)

# Instrument SQLAlchemy to capture query spans automatically
SQLAlchemyInstrumentor().instrument(
    engine=engine,
    enable_commenter=True,  # Adds trace context as SQL comments
)
```

The `enable_commenter` option is particularly useful. It adds trace context as comments in your SQL queries, which means you can correlate slow queries in your database logs directly back to the traces that generated them.

### Node.js with Prisma

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Initialize the OpenTelemetry SDK with Prisma instrumentation
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'user-service',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'https://otel.oneuptime.com/v1/traces',
  }),
  instrumentations: [
    new PrismaInstrumentation({
      // Capture the full query text in spans
      middleware: true,
    }),
  ],
});

sdk.start();
```

This configures the Node.js OpenTelemetry SDK with Prisma-specific instrumentation. Every database call made through Prisma will generate a span with query details, timing information, and the model being accessed.

---

## Capturing Custom Database Metrics

Auto-instrumentation handles the basics, but for serious database optimization you want additional metrics that track patterns over time.

```python
# db_metrics.py
from opentelemetry import metrics, trace
import time

meter = metrics.get_meter("database.performance")
tracer = trace.get_tracer("database.performance")

# Histogram for query durations, bucketed for analysis
query_duration = meter.create_histogram(
    name="db.query.duration",
    description="Duration of database queries in milliseconds",
    unit="ms",
)

# Counter for queries by type and table
query_count = meter.create_counter(
    name="db.query.count",
    description="Number of database queries executed",
    unit="queries",
)

# Histogram for result set sizes
result_size = meter.create_histogram(
    name="db.query.result_size",
    description="Number of rows returned by queries",
    unit="rows",
)

def track_query(query_type: str, table: str, func):
    """Decorator to track database query performance."""
    def wrapper(*args, **kwargs):
        attributes = {
            "db.operation": query_type,
            "db.sql.table": table,
            "db.system": "postgresql",
        }

        start = time.perf_counter()
        with tracer.start_as_current_span(
            f"db.{query_type}.{table}",
            attributes=attributes,
        ) as span:
            try:
                result = func(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - start) * 1000

                query_duration.record(elapsed_ms, attributes)
                query_count.add(1, attributes)

                # Track result set size if applicable
                if hasattr(result, '__len__'):
                    result_size.record(len(result), attributes)
                    span.set_attribute("db.result.rows", len(result))

                # Flag slow queries
                if elapsed_ms > 100:
                    span.set_attribute("db.slow_query", True)
                    span.add_event("slow_query_detected", {
                        "duration_ms": elapsed_ms,
                        "threshold_ms": 100,
                    })

                return result
            except Exception as e:
                span.set_attribute("db.error", True)
                span.record_exception(e)
                raise
    return wrapper
```

This decorator wraps database calls to capture both spans and metrics. The key addition here is flagging slow queries with a `db.slow_query` attribute, which makes them easy to filter for in your observability backend.

---

## Tracking Connection Pool Health

Database connection pools are a common source of performance problems. When the pool is exhausted, queries queue up and latency spikes.

```python
# pool_metrics.py
from opentelemetry import metrics
from sqlalchemy import event

meter = metrics.get_meter("database.pool")

# Track connection pool utilization
pool_size_gauge = meter.create_observable_gauge(
    name="db.pool.size",
    description="Total number of connections in the pool",
    unit="connections",
    callbacks=[lambda options: [
        metrics.Observation(engine.pool.size(), {"pool": "default"})
    ]],
)

pool_checked_out = meter.create_observable_gauge(
    name="db.pool.checked_out",
    description="Number of connections currently checked out",
    unit="connections",
    callbacks=[lambda options: [
        metrics.Observation(engine.pool.checkedout(), {"pool": "default"})
    ]],
)

pool_overflow = meter.create_observable_gauge(
    name="db.pool.overflow",
    description="Number of overflow connections created",
    unit="connections",
    callbacks=[lambda options: [
        metrics.Observation(engine.pool.overflow(), {"pool": "default"})
    ]],
)

# Track time spent waiting for a connection
checkout_wait_time = meter.create_histogram(
    name="db.pool.checkout_wait",
    description="Time spent waiting for a connection from the pool",
    unit="ms",
)

# Use SQLAlchemy events to track checkout timing
@event.listens_for(engine, "checkout")
def on_checkout(dbapi_connection, connection_record, connection_proxy):
    connection_record.info["checkout_time"] = time.perf_counter()

@event.listens_for(engine, "checkin")
def on_checkin(dbapi_connection, connection_record):
    if "checkout_time" in connection_record.info:
        duration = (time.perf_counter() - connection_record.info["checkout_time"]) * 1000
        checkout_wait_time.record(duration, {"pool": "default"})
```

These pool metrics give you early warning signs of connection exhaustion. When `db.pool.checked_out` consistently approaches `db.pool.size`, it is time to either increase the pool size or investigate why connections are being held too long.

---

## Identifying N+1 Query Problems

N+1 queries are one of the most common database performance antipatterns. OpenTelemetry makes them easy to spot because you can see all the database spans within a single request trace.

```python
# n_plus_one_detector.py
from opentelemetry import trace
from collections import Counter

def analyze_trace_for_n_plus_one(span_data):
    """
    Analyze a completed trace for N+1 query patterns.
    Looks for repeated identical queries within the same parent span.
    """
    # Group spans by parent and query template
    parent_queries = {}
    for span in span_data:
        parent_id = span.get("parent_span_id")
        query_template = normalize_query(span.get("db.statement", ""))

        if parent_id not in parent_queries:
            parent_queries[parent_id] = Counter()
        parent_queries[parent_id][query_template] += 1

    # Flag any query that appears more than 5 times under the same parent
    issues = []
    for parent_id, queries in parent_queries.items():
        for query, count in queries.items():
            if count > 5:
                issues.append({
                    "parent_span": parent_id,
                    "query_template": query,
                    "execution_count": count,
                    "recommendation": "Consider using a JOIN or batch query",
                })
    return issues

def normalize_query(query: str) -> str:
    """Replace literal values with placeholders to group similar queries."""
    import re
    # Replace numeric literals
    normalized = re.sub(r'\b\d+\b', '?', query)
    # Replace string literals
    normalized = re.sub(r"'[^']*'", '?', normalized)
    return normalized
```

This analysis function processes completed traces to detect N+1 patterns. When the same query template appears more than 5 times under a single parent span, it strongly suggests an N+1 problem that should be refactored into a batch query or JOIN.

---

## Query Performance Dashboard

```mermaid
graph TD
    subgraph Dashboard["Database Performance Dashboard"]
        A["Slowest Queries (P95 > 100ms)<br/>1. SELECT * FROM orders WHERE... (P95: 450ms)<br/>2. SELECT * FROM users JOIN... (P95: 280ms)"]
        B["Query Volume by Table<br/>orders: 12K/min | users: 8K/min | products: 3K/min"]
        C["Connection Pool Health<br/>Size: 20 | In Use: 14 | Overflow: 2"]
        D["N+1 Detections<br/>3 endpoints with suspected N+1 patterns"]
    end
```

---

## Practical Optimization Workflow

With all this data flowing, here is the workflow for actually using it to optimize queries:

1. Start with the P95 query duration histogram. Sort by the slowest queries.
2. Look at the trace context for slow queries. Which endpoints trigger them? What is the calling pattern?
3. Check the result set sizes. Queries returning thousands of rows to the application often indicate missing pagination or over-fetching.
4. Review the connection pool metrics. If the pool is frequently exhausted, slow queries might be holding connections too long.
5. Run the N+1 detector on traces from your busiest endpoints.

Each of these steps is driven by the data you are already collecting through OpenTelemetry. No guesswork, no profiling sessions, just systematic analysis of production behavior.

The key insight is that database performance optimization is not a one-time activity. Your query patterns change as your application evolves and your data grows. By keeping these metrics flowing continuously, you catch regressions early and maintain consistent database performance over time.
