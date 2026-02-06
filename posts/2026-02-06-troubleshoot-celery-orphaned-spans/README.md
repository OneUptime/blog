# How to Troubleshoot Celery Worker Spans Being Orphaned from Parent Traces Due to Missing Context Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Celery, Python, Distributed Tracing

Description: Fix orphaned Celery worker spans by propagating OpenTelemetry trace context through Celery task headers correctly.

When a web request triggers a Celery task, the task execution should appear as a child span of the request trace. Without proper context propagation, the Celery worker creates a new root span, disconnected from the original request. This breaks the end-to-end trace and makes it impossible to follow a request across synchronous and asynchronous processing.

## The Problem

```python
# views.py - Django view triggers a Celery task
from myapp.tasks import process_order

def create_order(request):
    order = Order.objects.create(...)
    process_order.delay(order.id)  # Context is NOT propagated
    return JsonResponse({"order_id": order.id})
```

```python
# tasks.py - Celery task
from celery import shared_task

@shared_task
def process_order(order_id):
    # This span is a root span - no parent!
    order = Order.objects.get(id=order_id)
    charge_payment(order)
    send_confirmation(order)
```

In the tracing backend, the HTTP request trace and the Celery task trace are completely separate.

## The Fix: Use OpenTelemetry Celery Instrumentation

The `opentelemetry-instrumentation-celery` package handles context propagation automatically:

```bash
pip install opentelemetry-instrumentation-celery
```

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.celery import CeleryInstrumentor

resource = Resource.create({SERVICE_NAME: "celery-worker"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument Celery
CeleryInstrumentor().instrument()
```

The instrumentation injects the trace context into Celery task headers when `delay()` or `apply_async()` is called, and extracts it in the worker before executing the task.

## Both Sides Need Instrumentation

The web application and the Celery worker both need OpenTelemetry initialized:

**Web application** (producer side):
```python
# Django settings or WSGI file
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.django import DjangoInstrumentor

CeleryInstrumentor().instrument()
DjangoInstrumentor().instrument()
```

**Celery worker** (consumer side):
```python
# celery.py or worker startup
from opentelemetry.instrumentation.celery import CeleryInstrumentor

CeleryInstrumentor().instrument()
```

Starting the worker:

```bash
OTEL_SERVICE_NAME=celery-worker \
opentelemetry-instrument celery -A myapp worker -l info
```

## Manual Context Propagation

If you cannot use the auto-instrumentation, propagate context manually:

```python
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract

# Producer side - inject context into headers
def send_task_with_context(task, *args, **kwargs):
    headers = {}
    inject(headers)  # Inject current trace context
    return task.apply_async(args=args, kwargs=kwargs, headers=headers)

# Usage
send_task_with_context(process_order, order.id)
```

```python
# Consumer side - extract context from headers
from celery.signals import task_prerun

@task_prerun.connect
def extract_context(sender, headers=None, **kwargs):
    if headers:
        ctx = extract(headers)
        token = context.attach(ctx)
        # Store token for later detach
        sender.request._otel_token = token
```

## Celery Worker Configuration

Start the Celery worker with OpenTelemetry:

```bash
# Using opentelemetry-instrument
opentelemetry-instrument \
    --service_name celery-worker \
    --exporter_otlp_endpoint http://collector:4318 \
    celery -A myapp worker -l info -c 4
```

Or with manual setup:

```python
# myapp/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myapp.settings')

app = Celery('myapp')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Initialize OpenTelemetry on worker start
from celery.signals import worker_process_init

@worker_process_init.connect(weak=False)
def init_tracing(**kwargs):
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.celery import CeleryInstrumentor

    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    CeleryInstrumentor().instrument()
```

## Expected Trace Output

When context propagation works correctly:

```
POST /api/orders                    [==================] 100ms  (web server)
  django.view create_order          [================]    95ms
    celery.apply process_order      [=]                    5ms  (enqueue)
      celery.run process_order        [==============] 2000ms  (worker)
        db.query charge_payment         [========]      500ms
        send_confirmation                      [====]   200ms
```

The entire flow from HTTP request through Celery task execution is in a single connected trace.

## Common Pitfalls

1. **Celery with prefork pool**: Each worker process needs its own TracerProvider. Use `worker_process_init` signal.
2. **Celery with eventlet/gevent**: Context propagation behaves differently with green threads. Test thoroughly.
3. **Task retries**: Each retry should create a new span linked to the original context.
4. **Task chains and groups**: Context propagates through chains but may not through groups unless each task in the group has the header.

The key is that both the producer (web app) and consumer (Celery worker) must have the Celery instrumentation active. The instrumentation handles injecting and extracting trace context through Celery's header mechanism.
