# How to Turn Slow Database Queries into Actionable Metrics with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Database, Metrics, Observability, SQL, Performance, Tracing, Slow Queries

Description: Learn how to capture slow database queries and transform them into actionable metrics using OpenTelemetry spans, histograms, and custom attributes for effective performance monitoring.

---

> Slow database queries are the silent killers of application performance. They lurk behind high response times, frustrated users, and mysterious timeouts. The real problem is not that slow queries exist - it is that most teams lack visibility into them until something breaks in production.

OpenTelemetry gives you the tools to capture query-level performance data and turn it into structured, queryable metrics. Instead of tailing logs and hoping to find the offending SQL statement, you can build dashboards and alerts that surface slow queries automatically. This guide walks through the entire process, from capturing query spans to building meaningful metrics from them.

---

## Why Traditional Approaches Fall Short

Most database monitoring relies on one of two approaches: slow query logs or APM agents that capture some query data as a side effect. Slow query logs are useful but limited. They only capture queries above a threshold, they live in separate log files that need parsing, and they lack the context of the application request that triggered them.

OpenTelemetry changes this by embedding query performance data directly into your application traces. Every query becomes a span with timing data, the SQL statement, connection metadata, and any custom attributes you add. From there, you can derive metrics that tell you exactly which queries are degrading and how they affect end-user experience.

---

## Architecture Overview

The approach is straightforward. Your application instruments database calls as spans, enriches them with attributes, and exports them to an OpenTelemetry Collector. The collector processes spans, extracts metrics using the span metrics connector, and forwards everything to your observability backend.

```mermaid
flowchart LR
    A[Application] -->|OTLP Spans| B[OTel Collector]
    B -->|Span Metrics Connector| C[Metrics Pipeline]
    B -->|Trace Pipeline| D[Trace Backend]
    C --> E[Metrics Backend]
    E --> F[Dashboards & Alerts]
    D --> F
```

---

## Step 1: Instrument Database Calls with OpenTelemetry

Most OpenTelemetry language SDKs provide auto-instrumentation libraries for popular database drivers. Here is a Python example using SQLAlchemy, but the same principles apply to any language or ORM.

First, install the required packages for Python database instrumentation.

```bash
# Install OpenTelemetry core packages
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# Install the SQLAlchemy instrumentation library
pip install opentelemetry-instrumentation-sqlalchemy
```

Next, set up the tracer provider and enable auto-instrumentation for SQLAlchemy. This captures every query as a span without changing your application code.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from sqlalchemy import create_engine

# Configure the tracer provider with OTLP export
provider = TracerProvider()
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://localhost:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Create the database engine
engine = create_engine("postgresql://user:pass@localhost:5432/mydb")

# Enable automatic instrumentation for all SQLAlchemy queries
# This wraps every query execution in a span with timing and SQL details
SQLAlchemyInstrumentor().instrument(engine=engine)
```

With this in place, every query executed through SQLAlchemy will produce a span containing `db.statement`, `db.system`, and duration information.

---

## Step 2: Add Custom Attributes for Better Context

Auto-instrumentation captures the basics, but custom attributes make your data far more useful. You want to know which table, which operation type, and whether the query hit a slow threshold.

This helper function wraps a query execution and enriches the span with custom attributes that help you filter and group slow queries later.

```python
from opentelemetry import trace
import time

tracer = trace.get_tracer("db-instrumentation")

def execute_with_context(session, query, params=None, query_name="unnamed"):
    """Execute a query and enrich the span with custom attributes."""
    with tracer.start_as_current_span("db.query") as span:
        # Add a human-readable query name for easier identification
        span.set_attribute("db.query.name", query_name)
        span.set_attribute("db.system", "postgresql")

        start = time.monotonic()
        result = session.execute(query, params)
        duration_ms = (time.monotonic() - start) * 1000

        # Record query duration as a span attribute
        span.set_attribute("db.query.duration_ms", duration_ms)

        # Flag queries that exceed the slow threshold (500ms)
        if duration_ms > 500:
            span.set_attribute("db.query.slow", True)
            span.add_event("slow_query_detected", {
                "duration_ms": duration_ms,
                "threshold_ms": 500
            })

        return result
```

The `db.query.slow` attribute is particularly powerful. It lets you filter for slow queries across your entire system without having to define thresholds in every dashboard.

---

## Step 3: Record Query Duration as a Histogram Metric

Spans give you trace-level detail, but histograms give you aggregate views. Recording query duration as a histogram lets you track p50, p95, and p99 latencies across all your queries.

This code creates a histogram metric that records query durations alongside the span data.

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metrics_exporter import OTLPMetricExporter

# Set up the meter provider with OTLP export
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
    export_interval_millis=10000  # Export every 10 seconds
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter("db-metrics")

# Create a histogram to track query duration distribution
# Bucket boundaries are in milliseconds
query_duration_histogram = meter.create_histogram(
    name="db.query.duration",
    description="Duration of database queries in milliseconds",
    unit="ms"
)

# Create a counter for slow queries
slow_query_counter = meter.create_counter(
    name="db.query.slow.count",
    description="Number of queries that exceeded the slow threshold"
)

def record_query_metrics(duration_ms, query_name, db_system, is_slow):
    """Record query performance as metrics for aggregate analysis."""
    # Attributes let you slice metrics by query name, database, etc.
    attributes = {
        "db.query.name": query_name,
        "db.system": db_system
    }

    # Record the duration in the histogram
    query_duration_histogram.record(duration_ms, attributes)

    # Increment the slow query counter if applicable
    if is_slow:
        slow_query_counter.add(1, attributes)
```

---

## Step 4: Use the Span Metrics Connector in the Collector

If you prefer not to emit metrics from application code, the OpenTelemetry Collector can derive metrics from spans automatically. The span metrics connector converts span duration and count data into histogram metrics.

This collector configuration defines a pipeline that receives traces and generates metrics from them, filtering specifically for database spans.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # The spanmetrics connector converts span data into metrics
  spanmetrics:
    histogram:
      explicit:
        # Define bucket boundaries in milliseconds for query latency distribution
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    dimensions:
      # These span attributes become metric labels
      - name: db.system
      - name: db.query.name
      - name: db.query.slow
    # Only process spans that represent database operations
    dimensions_cache_size: 1000

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Filter to only process database-related spans for metrics generation
  filter/db:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: db.system
            value: ".*"

exporters:
  otlp/traces:
    endpoint: https://oneuptime.com/otlp
    tls:
      insecure: false

  otlp/metrics:
    endpoint: https://oneuptime.com/otlp
    tls:
      insecure: false

service:
  pipelines:
    # Traces pipeline - sends raw spans to the backend
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [spanmetrics, otlp/traces]

    # Metrics pipeline - receives derived metrics from the spanmetrics connector
    metrics:
      receivers: [spanmetrics]
      processors: [batch]
      exporters: [otlp/metrics]
```

The `spanmetrics` connector sits between the traces and metrics pipelines. It reads incoming spans, extracts duration data, and emits histogram metrics. The `dimensions` field controls which span attributes become metric labels.

---

## Step 5: Build Alerts on Slow Query Metrics

With metrics flowing into your backend, you can set up alerts that fire when query performance degrades. Here are some useful alert conditions to start with.

For a Node.js application, you can also instrument database calls using the `@opentelemetry/instrumentation-pg` library. The pattern is the same: capture the query as a span, record duration, and flag slow queries.

```javascript
// Node.js example using the pg (PostgreSQL) instrumentation
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { MeterProvider } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');

// Create a meter for recording query metrics
const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: 'http://localhost:4317',
      }),
      exportIntervalMillis: 10000,
    }),
  ],
});

const meter = meterProvider.getMeter('db-metrics');

// Create a histogram for tracking query durations
const queryDuration = meter.createHistogram('db.query.duration', {
  description: 'Database query duration in milliseconds',
  unit: 'ms',
});

// Register the PostgreSQL auto-instrumentation
// This automatically wraps all pg queries in spans
registerInstrumentations({
  instrumentations: [
    new PgInstrumentation({
      // Hook into query execution to record custom metrics
      responseHook: (span, responseInfo) => {
        const duration = responseInfo.duration;
        queryDuration.record(duration, {
          'db.system': 'postgresql',
          'db.query.slow': duration > 500,
        });
      },
    }),
  ],
});
```

---

## Step 6: Correlate Slow Queries with Application Traces

The real power of OpenTelemetry is correlation. When a slow query metric fires an alert, you can trace it back to the exact request that triggered it. This is possible because spans and metrics share the same attributes.

Here is how the flow works in practice:

```mermaid
sequenceDiagram
    participant User
    participant App as Application
    participant DB as Database
    participant Col as OTel Collector
    participant Backend as Observability Backend

    User->>App: HTTP GET /users
    App->>DB: SELECT * FROM users WHERE active = true
    Note over DB: Query takes 2.3 seconds
    DB-->>App: Result set
    App-->>User: 200 OK (slow)
    App->>Col: Span: db.query (duration=2300ms, slow=true)
    Col->>Backend: Trace + Derived Metrics
    Note over Backend: Alert fires: p95 query duration > 1000ms
    Backend-->>Backend: Link alert to trace ID for investigation
```

When the alert fires, you click through to the trace and see the full request context. You see which endpoint triggered the query, what the SQL statement was, and how it fits into the broader request timeline. No more guessing.

---

## Key Metrics to Track

Once your instrumentation is in place, focus on these metrics for database query performance:

- **db.query.duration (histogram)** - p50, p95, p99 latency by query name and database system
- **db.query.slow.count (counter)** - rate of slow queries, useful for alerting on sudden spikes
- **db.query.count (counter)** - total query throughput, helpful for capacity planning
- **db.query.error.count (counter)** - failed queries, catches connection issues and syntax errors

Group these by `db.query.name` and `db.system` to pinpoint exactly which queries are degrading and on which database.

---

## Practical Tips

**Set realistic thresholds.** A 500ms threshold works for OLTP queries, but analytical queries might legitimately take seconds. Use different thresholds for different query categories.

**Sanitize SQL statements.** Most OpenTelemetry instrumentation libraries sanitize SQL by default, replacing literal values with placeholders. Verify this is enabled to avoid leaking sensitive data into your traces.

**Use the collector for metric generation.** Deriving metrics from spans in the collector is simpler than maintaining separate metric instrumentation in application code. It also means you can adjust metric dimensions without redeploying your application.

**Start with auto-instrumentation.** Get baseline visibility first, then add custom attributes where you need deeper insight. You do not need to instrument every query manually from day one.

---

## Conclusion

Turning slow database queries into actionable metrics is not a complex undertaking when you use OpenTelemetry. The combination of span-level detail and histogram metrics gives you both the big picture and the ability to drill down into specific problematic queries. Start with auto-instrumentation, add custom attributes where needed, and use the OpenTelemetry Collector's span metrics connector to derive aggregate metrics without cluttering your application code. With this setup and a backend like [OneUptime](https://oneuptime.com), you will catch slow queries before your users do.
