# How to Export Prometheus Metrics in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, Metrics, Monitoring, FastAPI, Flask, Observability

Description: Learn how to export custom Prometheus metrics from Python applications. This guide covers counters, gauges, histograms, and summaries with practical examples for web frameworks and background workers.

---

> Prometheus is the standard for metrics collection in modern infrastructure. By exposing metrics from your Python applications, you enable powerful monitoring, alerting, and capacity planning. This guide shows you how to instrument your Python code properly.

Getting metrics right means understanding the four metric types and when to use each one. We will cover practical examples that you can adapt to your applications.

---

## Understanding Prometheus Metric Types

Prometheus provides four core metric types, each designed for specific use cases.

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| Counter | Things that only go up | Request count, errors, bytes sent |
| Gauge | Values that go up and down | Temperature, queue size, active connections |
| Histogram | Distribution with buckets | Request latency, response sizes |
| Summary | Distribution with quantiles | Similar to histogram, calculated client-side |

Choosing the right type matters. Using a gauge where you need a counter will produce incorrect rates in your dashboards.

---

## Basic Setup with prometheus_client

The prometheus_client library provides everything you need to expose metrics. Start with a minimal setup.

```python
# metrics_basic.py
# Basic Prometheus metrics setup for Python
from prometheus_client import Counter, Gauge, Histogram, Summary
from prometheus_client import start_http_server, REGISTRY
import time

# Counter: tracks cumulative values that only increase
# Use for: request counts, error counts, processed items
requests_total = Counter(
    'app_requests_total',  # Metric name (must be unique)
    'Total number of requests processed',  # Help text
    ['method', 'endpoint', 'status']  # Label names for dimensions
)

# Gauge: tracks values that can go up or down
# Use for: queue sizes, active connections, temperature
active_connections = Gauge(
    'app_active_connections',
    'Number of currently active connections'
)

# Histogram: tracks distribution of values in buckets
# Use for: request latency, response sizes
request_latency = Histogram(
    'app_request_latency_seconds',
    'Request latency in seconds',
    ['endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Summary: tracks distribution with pre-calculated quantiles
# Use when: you need specific percentiles and can afford client-side computation
request_duration = Summary(
    'app_request_duration_seconds',
    'Request duration in seconds',
    ['method']
)

def process_request(method: str, endpoint: str):
    """Simulate request processing with metrics"""
    # Track active connections
    active_connections.inc()  # Increment gauge

    start_time = time.time()

    try:
        # Simulate work
        time.sleep(0.1)

        # Increment counter with labels
        requests_total.labels(
            method=method,
            endpoint=endpoint,
            status='200'
        ).inc()

    except Exception as e:
        requests_total.labels(
            method=method,
            endpoint=endpoint,
            status='500'
        ).inc()
        raise

    finally:
        # Always decrement active connections
        active_connections.dec()

        # Record latency
        duration = time.time() - start_time
        request_latency.labels(endpoint=endpoint).observe(duration)
        request_duration.labels(method=method).observe(duration)

if __name__ == '__main__':
    # Start metrics server on port 8000
    start_http_server(8000)
    print("Metrics available at http://localhost:8000/metrics")

    # Keep running
    while True:
        process_request('GET', '/api/users')
        time.sleep(1)
```

---

## FastAPI Integration

For FastAPI applications, you can integrate metrics through middleware and a dedicated endpoint.

```python
# fastapi_metrics.py
# Prometheus metrics integration for FastAPI
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, multiprocess
import time
import os

app = FastAPI()

# Create metrics with descriptive names following Prometheus conventions
# Format: namespace_subsystem_name_unit
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'Number of HTTP requests currently being processed',
    ['method', 'endpoint']
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Middleware that records metrics for every request"""
    # Skip metrics endpoint to avoid recursion
    if request.url.path == "/metrics":
        return await call_next(request)

    method = request.method
    # Normalize endpoint to prevent high cardinality from path parameters
    endpoint = normalize_endpoint(request.url.path)

    # Track in-progress requests
    http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()

    start_time = time.time()

    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        status_code = 500
        raise
    finally:
        # Record request completion
        duration = time.time() - start_time

        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()

        http_request_duration_seconds.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

        http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()

    return response

def normalize_endpoint(path: str) -> str:
    """Replace dynamic path segments with placeholders"""
    # Example: /users/123/posts -> /users/{id}/posts
    parts = path.split('/')
    normalized = []

    for part in parts:
        if part.isdigit():
            normalized.append('{id}')
        elif len(part) == 36 and '-' in part:  # UUID-like
            normalized.append('{uuid}')
        else:
            normalized.append(part)

    return '/'.join(normalized)

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Check if running in multiprocess mode (gunicorn with multiple workers)
    if 'prometheus_multiproc_dir' in os.environ:
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        return Response(
            content=generate_latest(registry),
            media_type=CONTENT_TYPE_LATEST
        )

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    """Example endpoint"""
    return {"user_id": user_id}

@app.post("/orders")
async def create_order():
    """Example endpoint"""
    return {"status": "created"}
```

---

## Custom Business Metrics

Beyond HTTP metrics, you should track business-specific values that matter to your application.

```python
# business_metrics.py
# Custom business metrics for application monitoring
from prometheus_client import Counter, Gauge, Histogram, Info
from functools import wraps
import time

# Business event counters
orders_created = Counter(
    'business_orders_created_total',
    'Total orders created',
    ['plan_type', 'payment_method']
)

orders_failed = Counter(
    'business_orders_failed_total',
    'Total failed order attempts',
    ['reason']
)

# Revenue tracking (careful: ensure consistent currency/units)
revenue_total = Counter(
    'business_revenue_cents_total',
    'Total revenue in cents',
    ['plan_type']
)

# Queue and backlog metrics
task_queue_size = Gauge(
    'business_task_queue_size',
    'Number of tasks waiting in queue',
    ['queue_name']
)

# Processing time for business operations
order_processing_duration = Histogram(
    'business_order_processing_seconds',
    'Time to process an order',
    ['plan_type'],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

# Application info (labels as metric values)
app_info = Info(
    'app',
    'Application information'
)
app_info.info({
    'version': '1.2.3',
    'environment': 'production',
    'python_version': '3.11'
})

def track_order_processing(plan_type: str):
    """Decorator to track order processing metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                order_processing_duration.labels(plan_type=plan_type).observe(duration)

        return wrapper
    return decorator

class OrderService:
    """Example service with business metrics"""

    async def create_order(self, plan_type: str, payment_method: str, amount_cents: int):
        """Create an order with metric tracking"""
        try:
            # Process the order
            order = await self._process_order(plan_type, amount_cents)

            # Track success metrics
            orders_created.labels(
                plan_type=plan_type,
                payment_method=payment_method
            ).inc()

            revenue_total.labels(plan_type=plan_type).inc(amount_cents)

            return order

        except PaymentDeclinedException:
            orders_failed.labels(reason='payment_declined').inc()
            raise
        except InventoryException:
            orders_failed.labels(reason='out_of_stock').inc()
            raise

    @track_order_processing(plan_type='standard')
    async def _process_order(self, plan_type: str, amount_cents: int):
        """Internal order processing"""
        # Processing logic here
        pass

# Queue monitoring
class MetricsAwareQueue:
    """Queue wrapper that exposes size metrics"""

    def __init__(self, name: str):
        self.name = name
        self._items = []

    def put(self, item):
        self._items.append(item)
        task_queue_size.labels(queue_name=self.name).set(len(self._items))

    def get(self):
        item = self._items.pop(0)
        task_queue_size.labels(queue_name=self.name).set(len(self._items))
        return item
```

---

## Multiprocess Mode for Production

When running with multiple workers (gunicorn, uvicorn with workers), you need special handling to aggregate metrics across processes.

```python
# multiprocess_setup.py
# Prometheus multiprocess mode configuration
import os
from prometheus_client import Counter, Histogram, Gauge
from prometheus_client import CollectorRegistry, multiprocess, generate_latest

# Set the prometheus multiprocess directory BEFORE importing metrics
# This should be set as an environment variable before the app starts
# export prometheus_multiproc_dir=/tmp/prometheus_multiproc

def setup_multiprocess_metrics():
    """Configure metrics for multiprocess deployment"""
    # Ensure the directory exists
    prom_dir = os.environ.get('prometheus_multiproc_dir')
    if prom_dir:
        os.makedirs(prom_dir, exist_ok=True)

# For gauges in multiprocess mode, specify aggregation mode
# 'all' - show all values
# 'liveall' - show values from live processes
# 'livesum' - sum values from live processes
# 'max' - maximum value across processes
# 'min' - minimum value across processes

# This gauge will show the sum across all workers
active_users = Gauge(
    'app_active_users',
    'Number of active users',
    multiprocess_mode='livesum'
)

# This gauge will show the max across all workers
memory_usage_bytes = Gauge(
    'app_memory_usage_bytes',
    'Memory usage in bytes',
    multiprocess_mode='max'
)

def get_metrics():
    """Generate metrics output for multiprocess mode"""
    if 'prometheus_multiproc_dir' in os.environ:
        # Collect from all workers
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        return generate_latest(registry)
    else:
        # Single process mode
        return generate_latest()

# Cleanup on worker exit (for gunicorn)
def cleanup_on_exit():
    """Mark process as dead for accurate gauge values"""
    from prometheus_client import multiprocess
    multiprocess.mark_process_dead(os.getpid())
```

Gunicorn configuration for multiprocess metrics:

```python
# gunicorn_config.py
# Gunicorn configuration with Prometheus multiprocess support
import os
from prometheus_client import multiprocess

# Set multiprocess directory
os.environ['prometheus_multiproc_dir'] = '/tmp/prometheus_multiproc'

# Number of workers
workers = 4
worker_class = 'uvicorn.workers.UvicornWorker'

def child_exit(server, worker):
    """Clean up metrics when worker exits"""
    multiprocess.mark_process_dead(worker.pid)

def on_starting(server):
    """Clear old metrics on server start"""
    prom_dir = os.environ.get('prometheus_multiproc_dir')
    if prom_dir and os.path.exists(prom_dir):
        import shutil
        shutil.rmtree(prom_dir)
        os.makedirs(prom_dir)
```

---

## Background Worker Metrics

For Celery workers or other background job processors, expose metrics differently since there is no HTTP server.

```python
# worker_metrics.py
# Prometheus metrics for Celery background workers
from prometheus_client import Counter, Histogram, Gauge, push_to_gateway
from prometheus_client import CollectorRegistry, pushadd_to_gateway
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
import time

app = Celery('tasks', broker='redis://localhost:6379/0')

# Task metrics
tasks_total = Counter(
    'celery_tasks_total',
    'Total Celery tasks processed',
    ['task_name', 'status']
)

task_duration_seconds = Histogram(
    'celery_task_duration_seconds',
    'Celery task execution duration',
    ['task_name'],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

tasks_in_progress = Gauge(
    'celery_tasks_in_progress',
    'Number of Celery tasks currently executing',
    ['task_name']
)

# Store start times for duration calculation
task_start_times = {}

@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    """Called before task execution"""
    task_start_times[task_id] = time.time()
    tasks_in_progress.labels(task_name=task.name).inc()

@task_postrun.connect
def task_postrun_handler(task_id, task, *args, **kwargs):
    """Called after successful task execution"""
    # Record duration
    if task_id in task_start_times:
        duration = time.time() - task_start_times.pop(task_id)
        task_duration_seconds.labels(task_name=task.name).observe(duration)

    # Update counters
    tasks_total.labels(task_name=task.name, status='success').inc()
    tasks_in_progress.labels(task_name=task.name).dec()

@task_failure.connect
def task_failure_handler(task_id, exception, *args, **kwargs):
    """Called when task fails"""
    task = kwargs.get('sender')

    if task_id in task_start_times:
        duration = time.time() - task_start_times.pop(task_id)
        task_duration_seconds.labels(task_name=task.name).observe(duration)

    tasks_total.labels(task_name=task.name, status='failure').inc()
    tasks_in_progress.labels(task_name=task.name).dec()

# Push metrics to Prometheus Pushgateway
def push_metrics_to_gateway(job_name: str, gateway_url: str = 'localhost:9091'):
    """Push metrics to Prometheus Pushgateway"""
    # Use pushadd_to_gateway to add to existing metrics instead of replacing
    pushadd_to_gateway(
        gateway_url,
        job=job_name,
        registry=REGISTRY
    )

# Example task with manual metrics
@app.task
def process_document(document_id: str):
    """Example Celery task"""
    # Task processing happens here
    # Metrics are automatically recorded by signal handlers
    pass
```

---

## Metric Naming Conventions

Following Prometheus naming conventions makes your metrics easier to query and understand.

```python
# naming_conventions.py
# Prometheus metric naming best practices

# Good: clear, follows conventions
http_requests_total = Counter('http_requests_total', 'Total HTTP requests', ['method'])
http_request_duration_seconds = Histogram('http_request_duration_seconds', 'Duration in seconds')
http_response_size_bytes = Histogram('http_response_size_bytes', 'Response size in bytes')

# Bad: unclear units, inconsistent naming
# requests = Counter('requests', 'Requests')  # Missing unit, too vague
# response_time = Histogram('response_time', 'Time')  # What unit? Seconds? Milliseconds?
# HTTP_Requests = Counter('HTTP_Requests', '')  # Wrong casing, no description

# Pattern: {namespace}_{subsystem}_{name}_{unit}
# Examples:
# myapp_http_requests_total
# myapp_db_connections_current
# myapp_cache_hits_total
# myapp_queue_size_items
# myapp_processing_duration_seconds

# Labels should be low cardinality
# Good labels: method (GET/POST), status (2xx/4xx/5xx), endpoint (/users, /orders)
# Bad labels: user_id (millions of values), request_id (unique per request)
```

---

## Conclusion

Exporting Prometheus metrics from Python applications involves:

- **Choose the right metric type**: Counter for monotonic values, Gauge for fluctuating values, Histogram for distributions
- **Follow naming conventions**: Include units, use snake_case, add descriptive help text
- **Keep cardinality low**: Limit unique label combinations to prevent memory issues
- **Handle multiprocess**: Configure properly for production deployments with multiple workers
- **Track what matters**: Focus on metrics that drive decisions and alerts

With proper instrumentation, you gain visibility into your application's behavior and can build effective dashboards and alerts.

---

*Need to visualize your Prometheus metrics? [OneUptime](https://oneuptime.com) integrates with Prometheus and provides dashboards, alerting, and incident management in one platform.*

**Related Reading:**
- [How to Add Custom Metrics to Python Applications with Prometheus](https://oneuptime.com/blog/post/2025-01-06-python-prometheus-custom-metrics/view)
- [How to Instrument Python Applications with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-instrument-python-opentelemetry/view)
