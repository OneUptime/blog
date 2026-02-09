# How to Replace Datadog APM Libraries with OpenTelemetry SDKs in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Datadog, Python, APM, Migration, Tracing, Metrics, Flask, Django, FastAPI

Description: A step-by-step guide to replacing Datadog's ddtrace Python library with OpenTelemetry SDKs, covering auto-instrumentation, manual tracing, custom metrics, and framework-specific examples.

---

> Datadog's ddtrace library has been the go-to APM solution for many Python teams, but it comes with vendor lock-in and costs that scale with your infrastructure. OpenTelemetry provides a vendor-neutral alternative that covers the same ground while giving you the freedom to choose any backend. This guide walks through the complete replacement process.

We will cover removing ddtrace, installing OpenTelemetry, migrating custom traces and metrics, and handling framework-specific concerns for Flask, Django, and FastAPI.

---

## Why Replace ddtrace?

The `ddtrace` library is tightly coupled to the Datadog platform. Here is what you gain by switching to OpenTelemetry:

- **No vendor lock-in**: Send your telemetry to any OTLP-compatible backend
- **Lower costs**: Choose a backend that fits your budget instead of being tied to Datadog's per-host pricing
- **Industry standard**: OpenTelemetry skills and knowledge transfer across organizations
- **Growing ecosystem**: Active community with instrumentation for virtually every Python library

---

## Concept Mapping

Datadog APM and OpenTelemetry share similar concepts with different naming:

| Datadog (ddtrace) Concept | OpenTelemetry Equivalent |
|---|---|
| ddtrace.tracer.Tracer | opentelemetry.trace.Tracer |
| Span (ddtrace) | Span (OpenTelemetry) |
| Service (DD_SERVICE) | service.name resource attribute |
| Resource name | Span name |
| Span tag | Span attribute |
| Span type | Span kind |
| DogStatsD metric | Meter instrument |
| ddtrace-run | opentelemetry-instrument |
| patch_all() | auto-instrumentation bootstrap |

---

## Step 1: Remove Datadog Packages

Start by removing all Datadog-related Python packages from your project:

```bash
# Remove the Datadog tracing library and its extensions
pip uninstall ddtrace

# Remove the Datadog API client if you used it for custom metrics
pip uninstall datadog

# Remove DogStatsD client if installed separately
pip uninstall datadog-api-client

# Clean up any Datadog-related entries from requirements.txt
# Remove lines like:
# ddtrace==2.x.x
# datadog==0.x.x
```

Also remove Datadog-specific code from your application. Look for these common patterns:

```python
# REMOVE these imports and calls from your application code
# from ddtrace import tracer, patch_all
# patch_all()
# tracer.configure(hostname='datadog-agent', port=8126)

# REMOVE Datadog middleware if manually added
# from ddtrace.contrib.flask import TraceMiddleware
# TraceMiddleware(app, tracer, service="my-flask-app")
```

Remove Datadog environment variables from your deployment configuration:

```bash
# REMOVE these environment variables from your deployment
# DD_SERVICE=my-python-app
# DD_ENV=production
# DD_VERSION=1.0.0
# DD_AGENT_HOST=datadog-agent
# DD_TRACE_AGENT_PORT=8126
# DD_LOGS_INJECTION=true
# DD_TRACE_SAMPLE_RATE=1.0
```

---

## Step 2: Install OpenTelemetry Packages

Install the OpenTelemetry SDK and auto-instrumentation tools that replace ddtrace:

```bash
# Core OpenTelemetry packages
# These form the foundation of all instrumentation
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp

# Auto-instrumentation tools
# opentelemetry-distro provides the instrument command (replaces ddtrace-run)
# opentelemetry-instrumentation provides the bootstrap tool
pip install opentelemetry-distro \
            opentelemetry-instrumentation

# Auto-detect and install instrumentations for all libraries in your environment
# This scans your installed packages and installs matching instrumentations
# (Flask, Django, FastAPI, requests, psycopg2, redis, celery, etc.)
opentelemetry-bootstrap -a install
```

---

## Step 3: Run with Auto-Instrumentation

The simplest migration path is to replace `ddtrace-run` with `opentelemetry-instrument`. The command-line interface is similar:

```bash
# BEFORE: Running with Datadog auto-instrumentation
# ddtrace-run python app.py
# or
# ddtrace-run gunicorn myapp.wsgi:application

# AFTER: Running with OpenTelemetry auto-instrumentation
# Set the environment variables that replace DD_* variables
export OTEL_SERVICE_NAME="my-python-app"                    # was DD_SERVICE
export OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"  # was DD_AGENT_HOST
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token-here"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.0.0"

# Run with OpenTelemetry auto-instrumentation
opentelemetry-instrument python app.py

# Or with Gunicorn
opentelemetry-instrument gunicorn myapp.wsgi:application --workers 4
```

That is the minimum change needed. If your application only used ddtrace-run without any custom instrumentation code, you are done at this point. The auto-instrumentation covers Flask, Django, FastAPI, requests, urllib3, psycopg2, mysql-connector, redis, celery, grpc, and many more libraries.

---

## Step 4: Migrate Programmatic Configuration

If you configured ddtrace programmatically instead of using ddtrace-run, here is the equivalent OpenTelemetry setup:

```python
# BEFORE: Datadog programmatic configuration
# from ddtrace import tracer, patch_all
# tracer.configure(
#     hostname='datadog-agent',
#     port=8126,
#     enabled=True,
# )
# patch_all(flask=True, requests=True, psycopg=True)

# AFTER: OpenTelemetry programmatic configuration
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure resource attributes (replaces DD_SERVICE, DD_ENV, DD_VERSION)
resource = Resource.create({
    "service.name": "my-python-app",
    "service.version": "1.0.0",
    "deployment.environment": "production",
})

# Create and configure the tracer provider
provider = TracerProvider(resource=resource)

# Configure OTLP exporter (replaces hostname/port pointing to Datadog agent)
exporter = OTLPSpanExporter(
    endpoint="https://oneuptime.com/otlp",
    headers=(("x-oneuptime-token", "your-token-here"),),
)

# Use batch processing for efficient export
provider.add_span_processor(BatchSpanProcessor(exporter))

# Set as the global tracer provider
trace.set_tracer_provider(provider)
```

---

## Step 5: Migrate Custom Traces

Replace ddtrace manual instrumentation with OpenTelemetry API calls. The patterns are similar, with slightly different method names:

```python
# BEFORE: Datadog custom span creation
# from ddtrace import tracer
#
# def process_order(order_id, items):
#     with tracer.trace("process_order", service="order-service") as span:
#         span.set_tag("order.id", order_id)
#         span.set_tag("order.item_count", len(items))
#
#         with tracer.trace("validate_order") as child:
#             validate(items)
#             child.set_tag("validation.passed", True)
#
#         with tracer.trace("charge_payment") as child:
#             result = charge(order_id, calculate_total(items))
#             child.set_tag("payment.success", result.success)

# AFTER: OpenTelemetry custom span creation
from opentelemetry import trace

# Get a tracer instance (replaces using the global ddtrace.tracer)
tracer = trace.get_tracer("myapp.orders", "1.0.0")

def process_order(order_id, items):
    # start_as_current_span replaces tracer.trace()
    with tracer.start_as_current_span("process_order") as span:
        # set_attribute replaces set_tag
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))

        # Child spans are created automatically when there is a current span
        with tracer.start_as_current_span("validate_order") as child:
            validate(items)
            child.set_attribute("validation.passed", True)

        with tracer.start_as_current_span("charge_payment") as child:
            total = calculate_total(items)
            result = charge(order_id, total)
            child.set_attribute("payment.success", result.success)
            child.set_attribute("payment.amount", total)

    return {"order_id": order_id, "status": "completed"}
```

### Replacing the @tracer.wrap Decorator

Datadog provides a `@tracer.wrap()` decorator for tracing functions. Here is the OpenTelemetry equivalent:

```python
# BEFORE: Datadog @tracer.wrap decorator
# from ddtrace import tracer
#
# @tracer.wrap(service="user-service", resource="get_user")
# def get_user(user_id):
#     return db.query(f"SELECT * FROM users WHERE id = {user_id}")

# AFTER: OpenTelemetry manual decorator pattern
from opentelemetry import trace
from functools import wraps

tracer = trace.get_tracer("myapp.users")

def traced(span_name=None):
    """Decorator that replaces @tracer.wrap()"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            name = span_name or func.__name__
            with tracer.start_as_current_span(name) as span:
                span.set_attribute("code.function", func.__name__)
                span.set_attribute("code.namespace", func.__module__)
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(
                        trace.Status(trace.StatusCode.ERROR, str(e))
                    )
                    raise
        return wrapper
    return decorator

# Usage is similar to @tracer.wrap
@traced("get_user")
def get_user(user_id):
    return db.query("SELECT * FROM users WHERE id = %s", (user_id,))
```

---

## Step 6: Migrate Error Tracking

Replace Datadog error tracking patterns with OpenTelemetry exception recording:

```python
# BEFORE: Datadog error tracking
# from ddtrace import tracer
#
# with tracer.trace("risky_operation") as span:
#     try:
#         do_something_risky()
#     except Exception as e:
#         span.set_tag("error", True)
#         span.set_tag("error.msg", str(e))
#         span.set_tag("error.type", type(e).__name__)
#         raise

# AFTER: OpenTelemetry error tracking
from opentelemetry import trace

tracer = trace.get_tracer("myapp.operations")

with tracer.start_as_current_span("risky_operation") as span:
    try:
        do_something_risky()
    except Exception as e:
        # record_exception captures the full stack trace automatically
        # This replaces manually setting error tags
        span.record_exception(e)

        # Set span status to ERROR (replaces span.set_tag("error", True))
        span.set_status(
            trace.Status(trace.StatusCode.ERROR, str(e))
        )
        raise
```

---

## Step 7: Migrate Custom Metrics

Datadog custom metrics typically use the DogStatsD client. Replace these with OpenTelemetry Metrics API:

```python
# BEFORE: Datadog DogStatsD metrics
# from datadog import statsd
#
# statsd.increment("orders.placed", tags=["region:us-east"])
# statsd.histogram("orders.processing_time", duration, tags=["region:us-east"])
# statsd.gauge("orders.queue_size", queue_size)

# AFTER: OpenTelemetry Metrics API
from opentelemetry import metrics

# Get a Meter instance (replaces the statsd client)
meter = metrics.get_meter("myapp.orders", "1.0.0")

# Create a counter (replaces statsd.increment)
orders_placed = meter.create_counter(
    name="orders.placed",
    description="Total number of orders placed",
    unit="orders",
)

# Create a histogram (replaces statsd.histogram)
processing_time = meter.create_histogram(
    name="orders.processing_time",
    description="Time to process an order",
    unit="ms",
)

# Create an observable gauge (replaces statsd.gauge)
# OpenTelemetry gauges use a callback pattern for async observation
def get_queue_size(options):
    # This callback is called periodically by the SDK
    current_size = get_current_queue_size()
    options.observe(current_size, {"queue.name": "orders"})

queue_gauge = meter.create_observable_gauge(
    name="orders.queue_size",
    description="Current order queue depth",
    unit="orders",
    callbacks=[get_queue_size],
)

# Usage in your application code
def place_order(order):
    start_time = time.time()

    process(order)

    duration_ms = (time.time() - start_time) * 1000

    # Record counter increment with attributes (replaces tags)
    orders_placed.add(1, {"region": "us-east", "order.type": order.type})

    # Record histogram value
    processing_time.record(duration_ms, {"region": "us-east"})
```

To export metrics, add a metric reader to your configuration:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure metric export (replaces DogStatsD destination)
metric_exporter = OTLPMetricExporter(
    endpoint="https://oneuptime.com/otlp",
    headers=(("x-oneuptime-token", "your-token-here"),),
)

# Export metrics every 30 seconds
metric_reader = PeriodicExportingMetricReader(
    metric_exporter,
    export_interval_millis=30000,
)

# Set up the meter provider
meter_provider = MeterProvider(
    resource=resource,
    metric_readers=[metric_reader],
)
metrics.set_meter_provider(meter_provider)
```

---

## Step 8: Framework-Specific Notes

### Flask

```python
# BEFORE: Datadog Flask integration
# from ddtrace import patch_all
# patch_all(flask=True)

# AFTER: OpenTelemetry Flask instrumentation
# If using opentelemetry-instrument, this happens automatically.
# For programmatic setup:
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
```

### Django

```python
# BEFORE: Datadog Django integration in settings.py
# INSTALLED_APPS = ['ddtrace.contrib.django', ...]

# AFTER: OpenTelemetry Django instrumentation
# If using opentelemetry-instrument, just remove the Datadog entry.
# For programmatic setup in wsgi.py or manage.py:
from opentelemetry.instrumentation.django import DjangoInstrumentor
DjangoInstrumentor().instrument()
```

### FastAPI

```python
# BEFORE: Datadog FastAPI integration
# from ddtrace import patch_all
# patch_all(fastapi=True)

# AFTER: OpenTelemetry FastAPI instrumentation
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
```

---

## Step 9: Update Dockerfile

Here is a complete Dockerfile migration example:

```dockerfile
# BEFORE: Dockerfile with Datadog
# FROM python:3.12-slim
# RUN pip install ddtrace
# CMD ["ddtrace-run", "gunicorn", "myapp.wsgi:application"]

# AFTER: Dockerfile with OpenTelemetry
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install OpenTelemetry auto-instrumentation
RUN pip install opentelemetry-distro opentelemetry-instrumentation && \
    opentelemetry-bootstrap -a install

COPY . .

# Configure OpenTelemetry via environment variables
ENV OTEL_SERVICE_NAME="my-python-app"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"
ENV OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production"

# Replace ddtrace-run with opentelemetry-instrument
CMD ["opentelemetry-instrument", "gunicorn", "myapp.wsgi:application", \
     "--workers", "4", "--bind", "0.0.0.0:8000"]
```

---

## Verification Checklist

After completing the migration, verify:
- Traces appear with correct service name and environment
- HTTP request spans are generated for all endpoints
- Database queries are captured (PostgreSQL, MySQL, SQLite)
- Outgoing HTTP calls appear as client spans
- Redis and Celery operations are traced (if applicable)
- Custom spans and metrics are exported correctly
- Error spans include exception details and stack traces
- Distributed traces connect across service boundaries

---

## Conclusion

Replacing ddtrace with OpenTelemetry in Python is a smooth process because the concepts map almost one-to-one. Auto-instrumentation covers the same libraries, the manual API follows similar patterns, and the metrics system provides equivalent functionality. The main effort goes into finding and replacing Datadog-specific API calls in your codebase and updating deployment configurations.

The payoff is significant: your Python applications now use an industry standard for instrumentation, and you have the freedom to route telemetry data to whichever backend makes sense for your team and budget.

---

*Looking for a home for your OpenTelemetry data? [OneUptime](https://oneuptime.com) natively supports OTLP and provides traces, metrics, logs, dashboards, and alerts in one platform. Get started free today.*
