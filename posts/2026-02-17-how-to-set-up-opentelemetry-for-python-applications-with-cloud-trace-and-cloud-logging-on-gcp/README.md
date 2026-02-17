# How to Set Up OpenTelemetry for Python Applications with Cloud Trace and Cloud Logging on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, OpenTelemetry, Python, Cloud Trace, Cloud Logging

Description: A step-by-step guide to instrumenting Python applications with OpenTelemetry and exporting traces and logs to Google Cloud Trace and Cloud Logging.

---

Getting observability right for Python applications on GCP means connecting your traces to Cloud Trace and your logs to Cloud Logging, ideally with correlation between the two so you can jump from a slow trace to the relevant log lines. OpenTelemetry is the standard way to do this, and the GCP ecosystem has solid support for it.

In this guide, I will walk through setting up OpenTelemetry for a Python application from scratch, including traces, logs, auto-instrumentation for common frameworks, and the correlation between traces and logs that makes debugging actually productive.

## Installing the Dependencies

Start by installing the OpenTelemetry packages and the Google Cloud exporters:

```bash
# Core OpenTelemetry packages
pip install opentelemetry-api opentelemetry-sdk

# Google Cloud exporters
pip install opentelemetry-exporter-gcp-trace opentelemetry-exporter-gcp-monitoring

# Auto-instrumentation for common libraries
pip install opentelemetry-instrumentation-flask
pip install opentelemetry-instrumentation-requests
pip install opentelemetry-instrumentation-sqlalchemy
pip install opentelemetry-instrumentation-redis
pip install opentelemetry-instrumentation-grpc

# Cloud Logging integration
pip install google-cloud-logging
```

## Basic Trace Setup

Here is the foundational setup that configures OpenTelemetry to export traces to Cloud Trace:

```python
# otel_setup.py - OpenTelemetry configuration for GCP
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

def setup_tracing(
    service_name: str,
    service_version: str = '1.0.0',
    project_id: str = None,
    sampling_rate: float = 1.0,
):
    """Initialize OpenTelemetry tracing with Cloud Trace export."""

    # Define the resource that identifies this service
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        'cloud.provider': 'gcp',
    })

    # Configure sampling - ParentBased respects upstream decisions
    sampler = ParentBased(root=TraceIdRatioBased(sampling_rate))

    # Create the tracer provider
    provider = TracerProvider(
        resource=resource,
        sampler=sampler,
    )

    # Set up the Cloud Trace exporter
    exporter = CloudTraceSpanExporter(project_id=project_id)

    # BatchSpanProcessor buffers spans and sends them in batches
    processor = BatchSpanProcessor(
        exporter,
        max_queue_size=2048,
        max_export_batch_size=512,
        schedule_delay_millis=5000,
    )
    provider.add_span_processor(processor)

    # Register as the global tracer provider
    trace.set_tracer_provider(provider)

    # Set up W3C context propagation
    propagator = CompositePropagator([
        TraceContextTextMapPropagator(),
        W3CBaggagePropagator(),
    ])
    set_global_textmap(propagator)

    return provider
```

## Setting Up Cloud Logging with Trace Correlation

The real power comes from connecting your logs to your traces. When you log from within a traced operation, the log entry should include the trace ID so you can navigate between them in the Cloud Console.

```python
# logging_setup.py - Cloud Logging with trace correlation
import logging
import google.cloud.logging
from opentelemetry import trace

class TraceContextFilter(logging.Filter):
    """Logging filter that adds trace context to log records."""

    def filter(self, record):
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            # Format trace ID for Cloud Logging correlation
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
            record.trace_sampled = bool(ctx.trace_flags & 0x01)
        else:
            record.trace_id = None
            record.span_id = None
            record.trace_sampled = False
        return True

def setup_logging(project_id: str = None):
    """Set up Cloud Logging with trace correlation."""
    # Initialize the Cloud Logging client
    client = google.cloud.logging.Client(project=project_id)

    # Set up the Cloud Logging handler
    handler = client.get_default_handler()

    # Add trace context filter
    trace_filter = TraceContextFilter()

    # Configure the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)
    root_logger.addFilter(trace_filter)

    return root_logger
```

## Complete Flask Application Example

Here is a complete Flask application that ties everything together:

```python
# app.py - Flask application with full OpenTelemetry instrumentation
from flask import Flask, request, jsonify
import logging
import requests
import time

# Import our setup modules
from otel_setup import setup_tracing
from logging_setup import setup_logging

# Initialize tracing before anything else
provider = setup_tracing(
    service_name='order-service',
    service_version='2.1.0',
    project_id='my-project',
    sampling_rate=0.5,  # Sample 50% of traces
)

# Set up logging with trace correlation
logger = setup_logging(project_id='my-project')

# Import and apply auto-instrumentation
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Create the Flask app
app = Flask(__name__)

# Auto-instrument Flask and requests
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

# Get a tracer for custom spans
from opentelemetry import trace
tracer = trace.get_tracer(__name__)

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create a new order with full tracing and logging."""
    order_data = request.get_json()
    logger.info(f"Received order request for customer {order_data.get('customer_id')}")

    # Custom span for business logic
    with tracer.start_as_current_span('validate-order') as span:
        span.set_attribute('order.customer_id', order_data.get('customer_id'))
        span.set_attribute('order.item_count', len(order_data.get('items', [])))

        # Validate the order
        if not order_data.get('items'):
            logger.warning("Order rejected: no items")
            span.set_attribute('order.valid', False)
            return jsonify({'error': 'No items in order'}), 400

        span.set_attribute('order.valid', True)
        logger.info("Order validation passed")

    # Check inventory via another service
    with tracer.start_as_current_span('check-inventory') as span:
        try:
            # The requests instrumentation automatically propagates context
            response = requests.post(
                'http://inventory-service/api/check',
                json={'items': order_data['items']},
                timeout=5,
            )
            response.raise_for_status()
            inventory_result = response.json()
            span.set_attribute('inventory.available', inventory_result.get('available'))
            logger.info(f"Inventory check result: {inventory_result.get('available')}")
        except requests.RequestException as e:
            logger.error(f"Inventory service error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            return jsonify({'error': 'Inventory check failed'}), 503

    # Process payment
    with tracer.start_as_current_span('process-payment') as span:
        span.set_attribute('payment.amount', order_data.get('total', 0))
        logger.info(f"Processing payment of ${order_data.get('total', 0)}")

        try:
            payment_response = requests.post(
                'http://payment-service/api/charge',
                json={
                    'customer_id': order_data['customer_id'],
                    'amount': order_data['total'],
                },
                timeout=10,
            )
            payment_response.raise_for_status()
            logger.info("Payment processed successfully")
        except requests.RequestException as e:
            logger.error(f"Payment failed: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            return jsonify({'error': 'Payment processing failed'}), 503

    logger.info(f"Order created successfully for customer {order_data.get('customer_id')}")
    return jsonify({'status': 'created', 'order_id': 'ord-12345'}), 201

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Auto-Instrumentation for Common Libraries

OpenTelemetry can automatically instrument popular Python libraries without code changes. Here is how to set up the most common ones:

```python
# auto_instrument.py - Set up auto-instrumentation for common libraries
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.grpc import (
    GrpcInstrumentorServer,
    GrpcInstrumentorClient,
)
from opentelemetry.instrumentation.celery import CeleryInstrumentor

def instrument_all(app=None, db_engine=None):
    """Apply auto-instrumentation to common libraries."""

    # HTTP server - captures incoming request spans
    if app:
        FlaskInstrumentor().instrument_app(app)

    # HTTP client - captures outgoing request spans and propagates context
    RequestsInstrumentor().instrument()

    # Database - captures SQL query spans with query text
    if db_engine:
        SQLAlchemyInstrumentor().instrument(engine=db_engine)

    # Redis - captures Redis command spans
    RedisInstrumentor().instrument()

    # gRPC - captures both server and client spans
    GrpcInstrumentorServer().instrument()
    GrpcInstrumentorClient().instrument()

    # Celery - captures task execution spans
    CeleryInstrumentor().instrument()
```

## Adding Custom Attributes and Events

Enrich your traces with business-relevant information:

```python
# Adding custom attributes and events to spans
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_order(order):
    with tracer.start_as_current_span('process-order') as span:
        # Add business attributes
        span.set_attribute('order.id', order.id)
        span.set_attribute('order.total', order.total)
        span.set_attribute('order.item_count', len(order.items))
        span.set_attribute('customer.tier', order.customer.tier)

        # Add events for significant moments
        span.add_event('validation_started')

        if validate_order(order):
            span.add_event('validation_passed')
        else:
            span.add_event('validation_failed', {
                'reason': 'insufficient_stock',
            })
            span.set_status(trace.StatusCode.ERROR, 'Validation failed')
            return

        span.add_event('payment_initiated', {
            'amount': order.total,
            'currency': 'USD',
        })

        charge_customer(order)
        span.add_event('payment_completed')
```

## Deploying to Cloud Run

When deploying to Cloud Run, the setup works out of the box because Cloud Run provides default credentials. Here is a Dockerfile:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run sets PORT environment variable
ENV PORT=8080

# Use gunicorn for production
CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 app:app
```

The `requirements.txt`:

```text
flask==3.0.*
gunicorn==22.*
requests==2.*
opentelemetry-api==1.*
opentelemetry-sdk==1.*
opentelemetry-exporter-gcp-trace==1.*
opentelemetry-instrumentation-flask==0.*
opentelemetry-instrumentation-requests==0.*
google-cloud-logging==3.*
```

## Verifying the Setup

After deployment, verify that traces and logs are flowing correctly:

1. Make a few requests to your service
2. Open Cloud Trace in the Google Cloud Console
3. Find your traces and verify spans are connected
4. Click on a trace and look for the "Logs" tab to see correlated log entries
5. Open Cloud Logging and filter by trace ID to verify correlation

With this setup, you get full observability for your Python applications on GCP. Traces show you the timing of every operation, logs give you the details, and the correlation between them lets you move between the two seamlessly. Pair this with alerting from OneUptime and you will be able to respond to production issues quickly with all the context you need.
