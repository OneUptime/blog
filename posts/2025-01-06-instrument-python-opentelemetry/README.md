# How to Instrument Python Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Observability, Flask, FastAPI, Django, Auto-Instrumentation, Tracing

Description: A comprehensive guide to instrumenting Python applications with OpenTelemetry, covering auto-instrumentation for Flask, FastAPI, and Django, plus manual instrumentation techniques for custom spans and metrics.

---

> OpenTelemetry has become the industry standard for observability instrumentation. For Python developers, it offers both automatic and manual instrumentation options that make adding tracing, metrics, and logs straightforward without significant code changes.

Whether you're running Flask, FastAPI, or Django, OpenTelemetry provides first-class support for Python applications. This guide walks you through both auto-instrumentation for quick wins and manual instrumentation for fine-grained control.

---

## Prerequisites

Before we begin, ensure you have:
- Python 3.8 or higher
- pip or poetry for package management
- A running application (Flask, FastAPI, or Django)
- An OpenTelemetry-compatible backend (like [OneUptime](https://oneuptime.com))

---

## Quick Start: Auto-Instrumentation

Auto-instrumentation is the fastest way to add observability to your Python application. It automatically instruments popular libraries without code changes.

### Installation

Install the core OpenTelemetry packages along with auto-instrumentation tools. The `opentelemetry-bootstrap` command automatically detects and installs instrumentation libraries for frameworks you're using:

```bash
# Core OpenTelemetry packages - the foundation for all instrumentation
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp

# Auto-instrumentation package - enables zero-code instrumentation
pip install opentelemetry-distro \
            opentelemetry-instrumentation

# Automatically detect and install all available instrumentations
# for libraries in your environment (Flask, requests, SQLAlchemy, etc.)
opentelemetry-bootstrap -a install
```

### Running with Auto-Instrumentation

The simplest approach is using the `opentelemetry-instrument` command. This wrapper automatically instruments your application without any code changes:

```bash
# Set environment variables to configure the telemetry destination
# OTEL_SERVICE_NAME identifies your service in trace visualizations
export OTEL_SERVICE_NAME="my-python-app"

# OTLP endpoint where traces will be sent
export OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"

# Authentication header for your observability backend
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token-here"

# Run your application with auto-instrumentation enabled
# The wrapper intercepts calls and creates spans automatically
opentelemetry-instrument python app.py
```

That's it! Your application now sends traces to your observability backend.

---

## Auto-Instrumentation for Flask

### Installation

```bash
pip install flask \
            opentelemetry-instrumentation-flask \
            opentelemetry-exporter-otlp
```

### Programmatic Setup

This example demonstrates how to manually configure OpenTelemetry in a Flask application. This approach gives you more control over the tracer configuration and is useful when you need custom settings:

```python
# app.py
from flask import Flask, jsonify
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# Configure resource attributes that identify this service
# These attributes appear on every span and help with filtering
resource = Resource.create({
    "service.name": "flask-api",           # Unique service identifier
    "service.version": "1.0.0",            # Version for tracking deployments
    "deployment.environment": "production"  # Environment label
})

# Set up the tracer provider with resource attributes
# The provider manages tracer instances and span processors
provider = TracerProvider(resource=resource)

# Configure OTLP exporter to send traces to your backend
# Using HTTP/protobuf protocol for wide compatibility
otlp_exporter = OTLPSpanExporter(
    endpoint="https://oneuptime.com/otlp/v1/traces",
    headers={"x-oneuptime-token": "your-token-here"}
)

# Add BatchSpanProcessor for efficient batched exports
# Batching reduces network overhead compared to exporting each span individually
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Register this provider as the global tracer provider
trace.set_tracer_provider(provider)

# Create Flask app
app = Flask(__name__)

# Instrument Flask to automatically trace all incoming requests
# This creates spans for every HTTP request with method, route, status code
FlaskInstrumentor().instrument_app(app)

# Also instrument outgoing HTTP requests made with the requests library
# This ensures distributed tracing works across service boundaries
RequestsInstrumentor().instrument()

@app.route("/api/users")
def get_users():
    return jsonify({"users": ["alice", "bob", "charlie"]})

@app.route("/api/users/<user_id>")
def get_user(user_id):
    return jsonify({"user_id": user_id, "name": "Alice"})

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

### What Gets Instrumented Automatically

Flask auto-instrumentation captures:
- HTTP request/response attributes (method, URL, status code)
- Request duration
- Route information
- Exception details when errors occur

---

## Auto-Instrumentation for FastAPI

### Installation

```bash
pip install fastapi uvicorn \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-exporter-otlp
```

### Programmatic Setup

FastAPI applications benefit from async-aware instrumentation. This setup instruments both incoming requests and outgoing async HTTP calls using httpx:

```python
# main.py
from fastapi import FastAPI, HTTPException
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
import httpx

# Configure resource attributes for service identification
resource = Resource.create({
    "service.name": "fastapi-service",       # Service name in trace UI
    "service.version": "1.0.0",              # Track which version generated traces
    "deployment.environment": "production"    # Filter by environment
})

# Set up tracer provider with the configured resource
provider = TracerProvider(resource=resource)

# Create OTLP exporter for sending traces to backend
otlp_exporter = OTLPSpanExporter(
    endpoint="https://oneuptime.com/otlp/v1/traces",
    headers={"x-oneuptime-token": "your-token-here"}
)

# Use BatchSpanProcessor to export spans in batches for efficiency
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Set this provider as the global default
trace.set_tracer_provider(provider)

# Create FastAPI app with title for documentation
app = FastAPI(title="Instrumented FastAPI")

# Instrument FastAPI to auto-trace all endpoints
# Creates spans for requests with route, method, status attributes
FastAPIInstrumentor.instrument_app(app)

# Instrument httpx for tracing async HTTP client calls
# Essential for distributed tracing across microservices
HTTPXClientInstrumentor().instrument()

@app.get("/api/items")
async def list_items():
    return {"items": ["item1", "item2", "item3"]}

@app.get("/api/items/{item_id}")
async def get_item(item_id: int):
    if item_id < 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item_id": item_id, "name": f"Item {item_id}"}

@app.get("/api/external")
async def call_external():
    """Demonstrates traced outgoing HTTP calls"""
    # httpx calls are automatically traced due to instrumentation above
    async with httpx.AsyncClient() as client:
        response = await client.get("https://httpbin.org/get")
        return {"external_status": response.status_code}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Running FastAPI with Uvicorn

```bash
# With auto-instrumentation
opentelemetry-instrument uvicorn main:app --host 0.0.0.0 --port 8000

# Or run directly if instrumentation is in code
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Auto-Instrumentation for Django

### Installation

```bash
pip install django \
            opentelemetry-instrumentation-django \
            opentelemetry-exporter-otlp
```

### Setup in Django Settings

```python
# settings.py
import os

# OpenTelemetry configuration
OTEL_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "django-app")
OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "https://oneuptime.com/otlp"
)
OTEL_EXPORTER_OTLP_HEADERS = os.getenv(
    "OTEL_EXPORTER_OTLP_HEADERS",
    "x-oneuptime-token=your-token-here"
)
```

### Setup in Django WSGI/ASGI

```python
# wsgi.py
import os
from django.core.wsgi import get_wsgi_application
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.django import DjangoInstrumentor

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

# Configure OpenTelemetry before Django loads
resource = Resource.create({
    "service.name": "django-app",
    "service.version": "1.0.0",
    "deployment.environment": os.getenv("ENVIRONMENT", "development")
})

provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="https://oneuptime.com/otlp/v1/traces",
    headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}
)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(provider)

# Instrument Django
DjangoInstrumentor().instrument()

application = get_wsgi_application()
```

---

## Manual Instrumentation

While auto-instrumentation covers common patterns, manual instrumentation gives you control over custom business logic.

### Creating Custom Spans

Manual instrumentation allows you to trace custom business logic. This example shows how to create nested spans that capture the complete flow of an order processing operation:

```python
from opentelemetry import trace

# Get a tracer for your module - use a descriptive name for filtering
tracer = trace.get_tracer("my_app.services")

def process_order(order_id: str, items: list):
    """Process an order with custom spans"""

    # Create a parent span for the entire operation
    # All nested spans will be children of this span
    with tracer.start_as_current_span("process_order") as span:
        # Add attributes to provide context for debugging
        # Use semantic naming: resource.property format
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))

        # Create a child span for order validation
        # Nested spans automatically become children of the current span
        with tracer.start_as_current_span("validate_order") as validate_span:
            is_valid = validate_order_items(items)
            validate_span.set_attribute("validation.passed", is_valid)

            # Mark span as error if validation fails
            if not is_valid:
                validate_span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Invalid order items")
                )
                raise ValueError("Invalid order items")

        # Child span for total calculation
        with tracer.start_as_current_span("calculate_totals") as calc_span:
            total = calculate_order_total(items)
            calc_span.set_attribute("order.total", total)

        # Child span for payment processing - critical path to monitor
        with tracer.start_as_current_span("process_payment") as payment_span:
            payment_span.set_attribute("payment.amount", total)
            payment_result = charge_customer(order_id, total)
            # Record payment outcome for debugging and metrics
            payment_span.set_attribute("payment.success", payment_result.success)
            payment_span.set_attribute("payment.transaction_id", payment_result.transaction_id)

        # Set final status on parent span
        span.set_attribute("order.status", "completed")
        span.set_attribute("order.total", total)

        return {"order_id": order_id, "total": total, "status": "completed"}
```

### Adding Events and Exceptions

Events are timestamped annotations within a span. They're useful for marking significant points during execution. This example shows how to add events and properly record exceptions:

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer("my_app.services")

def risky_operation(data: dict):
    with tracer.start_as_current_span("risky_operation") as span:
        try:
            # Add an event to mark the start of processing
            # Events are like log entries attached to the span
            span.add_event("Starting processing", {
                "data.size": len(str(data)),
                "data.keys": str(list(data.keys()))
            })

            result = process_data(data)

            # Add success event with outcome details
            span.add_event("Processing completed", {
                "result.count": len(result)
            })

            return result

        except ValueError as e:
            # record_exception automatically captures stack trace
            # and adds it as an event with exception details
            span.record_exception(e)

            # Set span status to ERROR with description
            span.set_status(Status(StatusCode.ERROR, str(e)))

            # Add custom event with additional context
            # Useful for understanding why the error occurred
            span.add_event("Validation failed", {
                "error.type": type(e).__name__,
                "error.message": str(e)
            })

            raise
```

### Span Decorators for Clean Code

Create a reusable decorator to automatically trace functions. This pattern reduces boilerplate and ensures consistent instrumentation across your codebase:

```python
from functools import wraps
from opentelemetry import trace

tracer = trace.get_tracer("my_app.decorators")

def traced(span_name: str = None, attributes: dict = None):
    """Decorator for automatic span creation

    Args:
        span_name: Custom span name (defaults to function name)
        attributes: Static attributes to add to every span
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Use provided name or fall back to function name
            name = span_name or func.__name__

            with tracer.start_as_current_span(name) as span:
                # Add metadata about the function being called
                span.set_attribute("function.name", func.__name__)
                span.set_attribute("function.module", func.__module__)

                # Add any custom static attributes
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)

                try:
                    result = func(*args, **kwargs)
                    # Mark successful execution
                    span.set_attribute("function.success", True)
                    return result
                except Exception as e:
                    # Capture exception with full stack trace
                    span.record_exception(e)
                    span.set_status(
                        Status(StatusCode.ERROR, str(e))
                    )
                    span.set_attribute("function.success", False)
                    raise  # Re-raise after recording

        return wrapper
    return decorator

# Usage - simply decorate functions to trace them
@traced("user_registration", {"operation.type": "user_management"})
def register_user(email: str, name: str):
    # This function is automatically traced with custom span name
    return create_user_in_database(email, name)
```

### Async Support

For async/await code, you need an async-compatible decorator. The span context is properly maintained across await points:

```python
from opentelemetry import trace
from functools import wraps
import asyncio

tracer = trace.get_tracer("my_app.async")

def async_traced(span_name: str = None):
    """Decorator for async functions

    Works with async/await syntax while maintaining
    proper trace context across await points.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            name = span_name or func.__name__

            # Context manager works with async functions
            with tracer.start_as_current_span(name) as span:
                # Mark this as an async operation for filtering
                span.set_attribute("async", True)

                try:
                    # await the async function within the span context
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(
                        trace.Status(trace.StatusCode.ERROR, str(e))
                    )
                    raise

        return wrapper
    return decorator

# Usage with async functions
@async_traced("fetch_user_data")
async def fetch_user_data(user_id: str):
    """Async function with automatic tracing"""
    # All async operations within this function are covered by the span
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()
```

---

## Context Propagation

Context propagation ensures trace context flows across service boundaries.

### Extracting Context from Incoming Requests

```python
from opentelemetry import trace
from opentelemetry.propagate import extract
from flask import Flask, request

app = Flask(__name__)
tracer = trace.get_tracer("my_service")

@app.route("/api/process")
def process():
    # Extract context from incoming request headers
    context = extract(request.headers)

    # Create a span that continues the trace
    with tracer.start_as_current_span("process_request", context=context) as span:
        span.set_attribute("request.id", request.headers.get("X-Request-ID"))

        # Your processing logic here
        result = do_processing()

        return jsonify(result)
```

### Injecting Context into Outgoing Requests

```python
from opentelemetry import trace
from opentelemetry.propagate import inject
import requests

tracer = trace.get_tracer("my_service")

def call_downstream_service(data: dict):
    with tracer.start_as_current_span("call_downstream") as span:
        headers = {}

        # Inject trace context into headers
        inject(headers)

        # Add any custom headers
        headers["Content-Type"] = "application/json"

        response = requests.post(
            "http://downstream-service/api/process",
            json=data,
            headers=headers
        )

        span.set_attribute("http.status_code", response.status_code)

        return response.json()
```

---

## Complete Example: Flask Application

Here's a complete example bringing everything together:

```python
# app.py
import os
from flask import Flask, jsonify, request
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagate import extract, inject
import requests

# Configuration
SERVICE_NAME = os.getenv("SERVICE_NAME", "order-service")
OTLP_ENDPOINT = os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/traces")
OTLP_TOKEN = os.getenv("ONEUPTIME_TOKEN", "")

# Initialize OpenTelemetry
resource = Resource.create({
    "service.name": SERVICE_NAME,
    "service.version": "1.0.0",
    "deployment.environment": os.getenv("ENVIRONMENT", "development")
})

provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(
    endpoint=OTLP_ENDPOINT,
    headers={"x-oneuptime-token": OTLP_TOKEN}
)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Get tracer for manual instrumentation
tracer = trace.get_tracer(__name__)

# Create and instrument Flask app
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

# Database simulation
orders_db = {}

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.json

    with tracer.start_as_current_span("create_order") as span:
        order_id = f"order_{len(orders_db) + 1}"
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.items_count", len(data.get("items", [])))

        # Validate order
        with tracer.start_as_current_span("validate_order"):
            if not data.get("items"):
                span.set_attribute("validation.error", "no_items")
                return jsonify({"error": "No items in order"}), 400

        # Calculate total
        with tracer.start_as_current_span("calculate_total") as calc_span:
            total = sum(item.get("price", 0) * item.get("quantity", 1)
                       for item in data["items"])
            calc_span.set_attribute("order.total", total)

        # Save order
        order = {
            "id": order_id,
            "items": data["items"],
            "total": total,
            "status": "pending"
        }
        orders_db[order_id] = order

        span.add_event("Order created", {"order.id": order_id})

        return jsonify(order), 201

@app.route("/api/orders/<order_id>")
def get_order(order_id):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)

        order = orders_db.get(order_id)
        if not order:
            span.set_attribute("order.found", False)
            return jsonify({"error": "Order not found"}), 404

        span.set_attribute("order.found", True)
        span.set_attribute("order.status", order["status"])

        return jsonify(order)

@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": SERVICE_NAME
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

---

## Environment Variables Reference

OpenTelemetry supports configuration via environment variables:

```bash
# Service identification
export OTEL_SERVICE_NAME="my-python-service"
export OTEL_SERVICE_VERSION="1.0.0"

# OTLP exporter configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"

# Trace configuration
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.5"  # Sample 50% of traces

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.namespace=backend"

# Logging
export OTEL_LOG_LEVEL="info"
```

---

## Best Practices

### 1. Use Meaningful Span Names

```python
# Good: Descriptive, follows conventions
with tracer.start_as_current_span("process_payment"):
    pass

with tracer.start_as_current_span("db.users.find_by_email"):
    pass

# Bad: Too generic or includes variable data
with tracer.start_as_current_span("do_stuff"):  # Too vague
    pass

with tracer.start_as_current_span(f"process_order_{order_id}"):  # High cardinality
    pass
```

### 2. Add Relevant Attributes

```python
# Add business context
span.set_attribute("user.id", user_id)
span.set_attribute("order.total", total)
span.set_attribute("payment.method", "credit_card")

# Add technical context
span.set_attribute("db.operation", "SELECT")
span.set_attribute("http.status_code", 200)
span.set_attribute("cache.hit", True)
```

### 3. Handle Errors Properly

```python
try:
    result = risky_operation()
except Exception as e:
    span.record_exception(e)
    span.set_status(Status(StatusCode.ERROR, str(e)))
    raise  # Re-raise after recording
```

### 4. Use Sampling in Production

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 10% of traces
sampler = TraceIdRatioBased(0.1)

provider = TracerProvider(
    resource=resource,
    sampler=sampler
)
```

---

## Conclusion

OpenTelemetry instrumentation for Python provides a powerful, vendor-neutral way to add observability to your applications. Start with auto-instrumentation for quick wins, then add manual instrumentation for custom business logic.

Key takeaways:
- Auto-instrumentation gets you started quickly with zero code changes
- Manual instrumentation gives fine-grained control over spans and attributes
- Context propagation ensures traces flow across service boundaries
- Use semantic conventions for consistent attribute naming

The combination of auto and manual instrumentation gives you comprehensive visibility into your Python applications, making debugging and performance optimization significantly easier.

---

*Ready to start instrumenting your Python applications? [OneUptime](https://oneuptime.com) provides native OpenTelemetry support with automatic correlation of traces, logs, and metrics. Get started with our free tier today.*

**Related Reading:**
- [What are Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to name spans in OpenTelemetry](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
