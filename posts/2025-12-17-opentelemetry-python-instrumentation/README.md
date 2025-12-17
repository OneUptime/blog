# OpenTelemetry for Python Applications: A Complete Instrumentation Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Observability, Tracing, Metrics, Django, FastAPI, Flask

Description: A comprehensive guide to instrumenting Python applications with OpenTelemetry- from Django, FastAPI, and Flask auto-instrumentation to manual spans, metrics, and production-ready configurations.

---

> Python powers everything from quick scripts to large-scale web services. OpenTelemetry gives you unified observability across all of it- traces, metrics, and logs with zero vendor lock-in.

This guide walks through instrumenting Python applications with OpenTelemetry, covering auto-instrumentation for popular frameworks, manual instrumentation patterns, and production deployment strategies.

---

## Table of Contents

1. Why OpenTelemetry for Python?
2. Installation and Setup
3. Auto-Instrumentation (Zero-Code)
4. Django Instrumentation
5. FastAPI Instrumentation
6. Flask Instrumentation
7. Manual Instrumentation
8. Adding Custom Metrics
9. Structured Logging with Trace Correlation
10. Database and External Service Tracing
11. Async/Await Context Propagation
12. Exporter Configuration
13. Sampling Strategies
14. Production Deployment Patterns
15. Common Pitfalls and Best Practices

---

## 1. Why OpenTelemetry for Python?

| Benefit | Description |
|---------|-------------|
| Unified SDK | One library for traces, metrics, and logs |
| Framework support | Auto-instrumentation for Django, FastAPI, Flask, Celery, SQLAlchemy, and more |
| Vendor neutral | Export to any backend (OneUptime, Jaeger, Prometheus, etc.) |
| Active community | CNCF project with strong Python ecosystem support |
| Async native | Full support for asyncio and concurrent workloads |

---

## 2. Installation and Setup

### Core packages

```bash
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp \
            opentelemetry-instrumentation
```

### Framework-specific packages

```bash
# Django
pip install opentelemetry-instrumentation-django

# FastAPI
pip install opentelemetry-instrumentation-fastapi

# Flask
pip install opentelemetry-instrumentation-flask

# Common dependencies
pip install opentelemetry-instrumentation-requests \
            opentelemetry-instrumentation-sqlalchemy \
            opentelemetry-instrumentation-redis \
            opentelemetry-instrumentation-celery
```

### All-in-one auto-instrumentation

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

---

## 3. Auto-Instrumentation (Zero-Code)

The fastest way to get started- no code changes required:

```bash
# Set environment variables
export OTEL_SERVICE_NAME=my-python-service
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token"

# Run with auto-instrumentation
opentelemetry-instrument python app.py

# Or with gunicorn
opentelemetry-instrument gunicorn myapp.wsgi:application

# Or with uvicorn (FastAPI)
opentelemetry-instrument uvicorn main:app --host 0.0.0.0 --port 8000
```

This automatically instruments:
- HTTP servers and clients
- Database connections (psycopg2, SQLAlchemy, etc.)
- Redis, Celery, and more

---

## 4. Django Instrumentation

### telemetry.py

```python
# telemetry.py
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.celery import CeleryInstrumentor


def configure_telemetry():
    """Initialize OpenTelemetry for Django."""

    resource = Resource.create({
        SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "django-app"),
        SERVICE_VERSION: os.getenv("SERVICE_VERSION", "1.0.0"),
        DEPLOYMENT_ENVIRONMENT: os.getenv("ENVIRONMENT", "development"),
    })

    # Tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
                headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
            )
        )
    )
    trace.set_tracer_provider(trace_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
            headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
        ),
        export_interval_millis=60000,
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))

    # Auto-instrument Django and dependencies
    DjangoInstrumentor().instrument()
    Psycopg2Instrumentor().instrument()
    RedisInstrumentor().instrument()
    CeleryInstrumentor().instrument()

    print("OpenTelemetry configured for Django")
```

### settings.py integration

```python
# settings.py

# Import telemetry setup BEFORE Django loads
import telemetry
telemetry.configure_telemetry()

# ... rest of Django settings
```

### manage.py integration (alternative)

```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

    # Configure telemetry before Django starts
    from telemetry import configure_telemetry
    configure_telemetry()

    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
```

### Custom spans in Django views

```python
# views.py
from opentelemetry import trace
from django.http import JsonResponse

tracer = trace.get_tracer(__name__)

def checkout_view(request):
    with tracer.start_as_current_span("checkout.process") as span:
        span.set_attribute("user.id", request.user.id)
        span.set_attribute("cart.items", len(request.session.get("cart", [])))

        # Business logic
        with tracer.start_as_current_span("checkout.validate_inventory"):
            validate_inventory(request)

        with tracer.start_as_current_span("checkout.process_payment"):
            process_payment(request)

        return JsonResponse({"status": "success"})
```

---

## 5. FastAPI Instrumentation

### main.py

```python
# main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor


def setup_telemetry():
    resource = Resource.create({SERVICE_NAME: "fastapi-service"})

    # Traces
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
            headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
        ))
    )
    trace.set_tracer_provider(trace_provider)

    # Metrics
    metrics.set_meter_provider(MeterProvider(
        resource=resource,
        metric_readers=[PeriodicExportingMetricReader(OTLPMetricExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
            headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
        ))]
    ))

    # Auto-instrument
    HTTPXClientInstrumentor().instrument()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry()
    yield


app = FastAPI(lifespan=lifespan)
FastAPIInstrumentor.instrument_app(app)

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

# Custom metrics
request_counter = meter.create_counter(
    "api.requests.total",
    description="Total API requests",
)


@app.get("/users/{user_id}")
async def get_user(user_id: int, request: Request):
    request_counter.add(1, {"endpoint": "/users", "method": "GET"})

    with tracer.start_as_current_span("fetch_user") as span:
        span.set_attribute("user.id", user_id)
        # Fetch user from database
        user = await fetch_user_from_db(user_id)
        span.set_attribute("user.found", user is not None)
        return user


@app.post("/orders")
async def create_order(request: Request):
    with tracer.start_as_current_span("order.create") as span:
        body = await request.json()
        span.set_attribute("order.items", len(body.get("items", [])))

        async with tracer.start_as_current_span("order.validate"):
            await validate_order(body)

        async with tracer.start_as_current_span("order.persist"):
            order = await save_order(body)

        return {"order_id": order.id}
```

### Async context propagation

```python
import asyncio
from opentelemetry import trace, context
from opentelemetry.trace import set_span_in_context

tracer = trace.get_tracer(__name__)

async def process_items(items: list):
    """Process items concurrently while maintaining trace context."""
    current_ctx = context.get_current()

    async def process_single(item):
        # Restore context in concurrent task
        token = context.attach(current_ctx)
        try:
            with tracer.start_as_current_span(f"process_item") as span:
                span.set_attribute("item.id", item["id"])
                await asyncio.sleep(0.1)  # Simulate work
                return {"processed": True}
        finally:
            context.detach(token)

    with tracer.start_as_current_span("process_items.batch") as span:
        span.set_attribute("batch.size", len(items))
        results = await asyncio.gather(*[process_single(item) for item in items])
        return results
```

---

## 6. Flask Instrumentation

### app.py

```python
# app.py
import os
from flask import Flask, request, jsonify
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor


def create_app():
    # Setup telemetry BEFORE creating app
    resource = Resource.create({SERVICE_NAME: "flask-service"})

    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
            headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
        ))
    )
    trace.set_tracer_provider(trace_provider)

    metrics.set_meter_provider(MeterProvider(
        resource=resource,
        metric_readers=[PeriodicExportingMetricReader(OTLPMetricExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com/otlp"),
            headers=(("x-oneuptime-token", os.getenv("ONEUPTIME_TOKEN", "")),),
        ))]
    ))

    # Auto-instrument before app creation
    RequestsInstrumentor().instrument()

    app = Flask(__name__)
    FlaskInstrumentor().instrument_app(app)

    return app


app = create_app()
tracer = trace.get_tracer(__name__)


@app.route("/api/products", methods=["GET"])
def list_products():
    with tracer.start_as_current_span("products.list") as span:
        category = request.args.get("category")
        span.set_attribute("filter.category", category or "all")

        products = fetch_products(category)
        span.set_attribute("result.count", len(products))

        return jsonify(products)


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    with tracer.start_as_current_span("products.get") as span:
        span.set_attribute("product.id", product_id)

        product = fetch_product_by_id(product_id)
        if not product:
            span.set_status(trace.Status(trace.StatusCode.ERROR, "Product not found"))
            return jsonify({"error": "Not found"}), 404

        return jsonify(product)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

---

## 7. Manual Instrumentation

### Basic span creation

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer("my-service", "1.0.0")

def process_order(order_id: str, items: list):
    with tracer.start_as_current_span("order.process") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))

        try:
            # Nested span
            with tracer.start_as_current_span("order.validate"):
                validate_order(items)

            with tracer.start_as_current_span("order.charge"):
                charge_customer(order_id)

            with tracer.start_as_current_span("order.fulfill"):
                fulfill_order(order_id, items)

            span.set_status(Status(StatusCode.OK))
            return {"status": "completed"}

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise
```

### Decorator pattern

```python
import functools
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def traced(span_name: str = None, attributes: dict = None):
    """Decorator for automatic span creation."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            name = span_name or f"{func.__module__}.{func.__name__}"
            with tracer.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator


# Async version
def traced_async(span_name: str = None, attributes: dict = None):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            name = span_name or f"{func.__module__}.{func.__name__}"
            with tracer.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator


# Usage
@traced("inventory.check")
def check_inventory(sku: str, quantity: int):
    # Business logic
    return {"available": True}


@traced_async("payment.process")
async def process_payment(amount: float):
    # Async payment processing
    return {"status": "approved"}
```

---

## 8. Adding Custom Metrics

```python
from opentelemetry import metrics

meter = metrics.get_meter("my-service", "1.0.0")

# Counter - monotonically increasing values
request_counter = meter.create_counter(
    name="http.requests.total",
    description="Total HTTP requests",
    unit="1",
)

# UpDownCounter - values that can increase or decrease
active_connections = meter.create_up_down_counter(
    name="connections.active",
    description="Currently active connections",
    unit="1",
)

# Histogram - distribution of values
request_duration = meter.create_histogram(
    name="http.request.duration",
    description="HTTP request duration",
    unit="ms",
)

# Observable Gauge - async measurement callback
def get_cpu_usage(options):
    import psutil
    yield metrics.Observation(psutil.cpu_percent(), {"host": "localhost"})

cpu_gauge = meter.create_observable_gauge(
    name="system.cpu.usage",
    callbacks=[get_cpu_usage],
    description="Current CPU usage percentage",
    unit="%",
)


# Using metrics in code
def handle_request(request):
    import time
    start = time.time()

    request_counter.add(1, {
        "method": request.method,
        "endpoint": request.path,
    })
    active_connections.add(1)

    try:
        response = process_request(request)
        return response
    finally:
        active_connections.add(-1)
        duration_ms = (time.time() - start) * 1000
        request_duration.record(duration_ms, {
            "method": request.method,
            "endpoint": request.path,
            "status": response.status_code,
        })
```

---

## 9. Structured Logging with Trace Correlation

```python
import logging
import json
from opentelemetry import trace

class JsonFormatter(logging.Formatter):
    """JSON formatter with trace context injection."""

    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Inject trace context
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            log_data["trace_id"] = format(ctx.trace_id, "032x")
            log_data["span_id"] = format(ctx.span_id, "016x")

        # Add extra fields
        if hasattr(record, "extra"):
            log_data.update(record.extra)

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


# Usage
logger = logging.getLogger(__name__)

def process_order(order_id: str):
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span("order.process") as span:
        span.set_attribute("order.id", order_id)

        # Log automatically includes trace_id and span_id
        logger.info("Processing order", extra={"order_id": order_id})

        try:
            result = do_processing(order_id)
            logger.info("Order completed", extra={"order_id": order_id, "result": result})
            return result
        except Exception as e:
            logger.error("Order failed", extra={"order_id": order_id}, exc_info=True)
            raise
```

---

## 10. Database and External Service Tracing

### SQLAlchemy instrumentation

```python
from sqlalchemy import create_engine
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

engine = create_engine("postgresql://user:pass@localhost/db")
SQLAlchemyInstrumentor().instrument(engine=engine)

# All queries now automatically create spans with:
# - db.system
# - db.name
# - db.statement (sanitized)
# - db.operation
```

### HTTP client instrumentation

```python
import requests
import httpx
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Sync requests
RequestsInstrumentor().instrument()

# Async httpx
HTTPXClientInstrumentor().instrument()

# Now all outbound HTTP calls create CLIENT spans
response = requests.get("https://api.example.com/users")

async with httpx.AsyncClient() as client:
    response = await client.get("https://api.example.com/users")
```

### Redis instrumentation

```python
import redis
from opentelemetry.instrumentation.redis import RedisInstrumentor

RedisInstrumentor().instrument()

client = redis.Redis(host="localhost", port=6379)
client.get("user:123")  # Creates a span with redis command details
```

### Celery instrumentation

```python
from celery import Celery
from opentelemetry.instrumentation.celery import CeleryInstrumentor

CeleryInstrumentor().instrument()

app = Celery("tasks", broker="redis://localhost:6379/0")

@app.task
def process_order(order_id):
    # This task execution creates spans with:
    # - Task name
    # - Task ID
    # - Queue name
    # - Retry count
    return {"processed": order_id}
```

---

## 11. Async/Await Context Propagation

```python
import asyncio
from opentelemetry import trace, context

tracer = trace.get_tracer(__name__)

async def fetch_data_concurrently():
    """Demonstrates context propagation in concurrent async tasks."""

    with tracer.start_as_current_span("fetch_all") as parent_span:
        # Capture context for child tasks
        ctx = context.get_current()

        async def fetch_user(user_id: int):
            # Attach parent context
            token = context.attach(ctx)
            try:
                with tracer.start_as_current_span(f"fetch_user") as span:
                    span.set_attribute("user.id", user_id)
                    await asyncio.sleep(0.1)  # Simulate API call
                    return {"id": user_id, "name": f"User {user_id}"}
            finally:
                context.detach(token)

        async def fetch_orders(user_id: int):
            token = context.attach(ctx)
            try:
                with tracer.start_as_current_span(f"fetch_orders") as span:
                    span.set_attribute("user.id", user_id)
                    await asyncio.sleep(0.05)
                    return [{"order_id": 1}, {"order_id": 2}]
            finally:
                context.detach(token)

        # Run concurrently - all spans will be children of fetch_all
        user, orders = await asyncio.gather(
            fetch_user(123),
            fetch_orders(123),
        )

        parent_span.set_attribute("result.user_found", user is not None)
        parent_span.set_attribute("result.order_count", len(orders))

        return {"user": user, "orders": orders}
```

---

## 12. Exporter Configuration

### OTLP (recommended)

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHTTPSpanExporter

# gRPC exporter (default)
grpc_exporter = OTLPSpanExporter(
    endpoint="https://oneuptime.com:4317",
    headers=(("x-oneuptime-token", "your-token"),),
)

# HTTP exporter (firewall-friendly)
http_exporter = OTLPHTTPSpanExporter(
    endpoint="https://oneuptime.com/otlp/v1/traces",
    headers={"x-oneuptime-token": "your-token"},
)
```

### Environment-based configuration

```bash
# Common OTLP configuration
export OTEL_SERVICE_NAME=my-python-service
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token"
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc  # or http/protobuf

# Traces specific
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://oneuptime.com/otlp/v1/traces

# Metrics specific
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://oneuptime.com/otlp/v1/metrics

# Sampling
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## 13. Sampling Strategies

```python
from opentelemetry.sdk.trace.sampling import (
    ALWAYS_ON,
    ALWAYS_OFF,
    TraceIdRatioBased,
    ParentBased,
)
from opentelemetry.sdk.trace import TracerProvider

# Always sample (development)
always_on_sampler = ALWAYS_ON

# Never sample
always_off_sampler = ALWAYS_OFF

# Sample 10% of traces
ratio_sampler = TraceIdRatioBased(0.1)

# Parent-based with fallback (recommended for production)
# - If parent is sampled, sample this span
# - If no parent, use ratio sampler
production_sampler = ParentBased(
    root=TraceIdRatioBased(0.1),  # 10% of new traces
)

provider = TracerProvider(sampler=production_sampler)
```

### Custom sampler

```python
from opentelemetry.sdk.trace.sampling import Sampler, Decision, SamplingResult
from opentelemetry.trace import SpanKind

class ErrorBiasedSampler(Sampler):
    """Sample all errors, sample percentage of successful requests."""

    def __init__(self, success_rate: float = 0.1):
        self.success_rate = success_rate

    def should_sample(self, parent_context, trace_id, name, kind, attributes, links):
        # Always sample if this looks like an error path
        if attributes and attributes.get("error"):
            return SamplingResult(Decision.RECORD_AND_SAMPLE)

        # Use trace ID for deterministic sampling
        if trace_id % 100 < (self.success_rate * 100):
            return SamplingResult(Decision.RECORD_AND_SAMPLE)

        return SamplingResult(Decision.DROP)

    def get_description(self):
        return f"ErrorBiasedSampler({self.success_rate})"
```

---

## 14. Production Deployment Patterns

### Docker configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Install OpenTelemetry auto-instrumentation
RUN pip install opentelemetry-distro opentelemetry-exporter-otlp
RUN opentelemetry-bootstrap -a install

# Use auto-instrumentation wrapper
CMD ["opentelemetry-instrument", "gunicorn", "myapp.wsgi:application", "-b", "0.0.0.0:8000"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  web:
    build: .
    environment:
      - OTEL_SERVICE_NAME=my-python-service
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_TRACES_SAMPLER=parentbased_traceidratio
      - OTEL_TRACES_SAMPLER_ARG=0.1
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
```

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-python-app:latest
          env:
            - name: OTEL_SERVICE_NAME
              value: "python-app"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4317"
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.namespace.name=$(POD_NAMESPACE),k8s.pod.name=$(POD_NAME)"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
```

---

## 15. Common Pitfalls and Best Practices

### Pitfalls to avoid

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Late initialization | Instrumentation misses early code | Initialize telemetry before importing app modules |
| Context loss in threads | Spans not connected | Use `context.attach()` in thread pool executors |
| High cardinality attributes | Exploding metrics/traces | Use bounded values, avoid user IDs in metric labels |
| Missing exception recording | Silent failures | Always call `span.record_exception()` in except blocks |
| PII in attributes | Compliance violations | Sanitize before setting attributes |
| Over-instrumentation | Performance overhead | Sample aggressively, instrument boundaries only |

### Best practices

```python
# 1. Initialize telemetry FIRST
# telemetry.py runs before app imports

# 2. Use context managers for clean span lifecycle
with tracer.start_as_current_span("operation") as span:
    # span automatically ends when block exits

# 3. Set span status explicitly
try:
    result = do_work()
    span.set_status(Status(StatusCode.OK))
except Exception as e:
    span.set_status(Status(StatusCode.ERROR, str(e)))
    span.record_exception(e)
    raise

# 4. Use semantic conventions
from opentelemetry.semconv.trace import SpanAttributes
span.set_attribute(SpanAttributes.HTTP_METHOD, "GET")
span.set_attribute(SpanAttributes.HTTP_URL, url)

# 5. Batch attribute setting
span.set_attributes({
    "user.id": user_id,
    "order.id": order_id,
    "order.total": total,
})

# 6. Add events for milestones (not new spans)
span.add_event("cache_miss", {"key": cache_key})
span.add_event("retry", {"attempt": 2, "reason": "timeout"})
```

---

## Summary

| Framework | Auto-Instrumentation | Manual Setup |
|-----------|---------------------|--------------|
| Django | `opentelemetry-instrument python manage.py runserver` | `DjangoInstrumentor().instrument()` |
| FastAPI | `opentelemetry-instrument uvicorn main:app` | `FastAPIInstrumentor.instrument_app(app)` |
| Flask | `opentelemetry-instrument flask run` | `FlaskInstrumentor().instrument_app(app)` |
| Celery | Auto via distro | `CeleryInstrumentor().instrument()` |

Python's OpenTelemetry SDK provides everything you need for production-grade observability. Start with auto-instrumentation, add custom spans for business logic, and export to OneUptime for unified visibility.

---

*Ready to see your Python telemetry? Send traces to [OneUptime](https://oneuptime.com) and correlate with metrics and logs in one place.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [What are Metrics in OpenTelemetry](/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/)
- [How to Structure Logs Properly in OpenTelemetry](/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/)
