# How to Add Custom Metrics to Python Applications with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, Metrics, Observability, Monitoring, FastAPI, Flask, Performance

Description: Learn how to add custom metrics to Python applications using the prometheus_client library. This guide covers counters, gauges, histograms, and summaries with practical examples for Flask and FastAPI applications.

---

> Metrics are the heartbeat of your application. They tell you how fast your system is running, how many requests it's handling, and whether anything is going wrong. With Prometheus and Python's prometheus_client library, adding custom metrics is straightforward and powerful.

Understanding what's happening inside your application requires more than just logs. Metrics give you quantitative data that you can alert on, visualize, and analyze over time. This guide shows you how to instrument Python applications with meaningful custom metrics.

---

## Why Custom Metrics Matter

Built-in metrics from frameworks tell you basic information, but custom metrics tell you about your business:

- **Request metrics**: How many users signed up? How many orders were processed?
- **Performance metrics**: How long does payment processing take? What's the database query latency?
- **Business metrics**: What's the conversion rate? How many items are in user carts?
- **Resource metrics**: How many connections are active? What's the cache hit rate?

---

## Getting Started with prometheus_client

### Installation

```bash
pip install prometheus-client
```

### Understanding Metric Types

Prometheus supports four core metric types:

| Type | Use Case | Example |
|------|----------|---------|
| **Counter** | Values that only increase | Total requests, errors, orders processed |
| **Gauge** | Values that can go up or down | Active connections, queue size, temperature |
| **Histogram** | Distribution of values | Request latency, response sizes |
| **Summary** | Similar to histogram with quantiles | Request duration percentiles |

---

## Basic Metrics Implementation

### Counter Example

Counters track cumulative values that only increase. They're reset to zero on restart. Use counters for counting events like requests, errors, or orders:

```python
from prometheus_client import Counter

# Create a counter with labels for dimensional data
# Labels allow filtering and grouping in Prometheus queries
http_requests_total = Counter(
    'http_requests_total',              # Metric name (must be unique)
    'Total HTTP requests',              # Description shown in docs
    ['method', 'endpoint', 'status']    # Label names for dimensions
)

# Increment the counter - use labels() to specify dimension values
def handle_request(method, endpoint, status_code):
    http_requests_total.labels(
        method=method,              # e.g., 'GET', 'POST'
        endpoint=endpoint,          # e.g., '/api/users'
        status=str(status_code)     # e.g., '200', '500'
    ).inc()  # Increment by 1

# Usage examples - each combination creates a separate time series
handle_request('GET', '/api/users', 200)   # Successful GET
handle_request('POST', '/api/orders', 201)  # Successful POST
handle_request('GET', '/api/users', 500)    # Error case
```

### Gauge Example

Gauges represent values that can increase or decrease. Use gauges for current state like queue size, active connections, or temperature:

```python
from prometheus_client import Gauge

# Create gauges - no labels for simple single-value metric
active_connections = Gauge(
    'active_connections',
    'Number of active database connections'
)

# Gauge with labels for multiple queues
queue_size = Gauge(
    'task_queue_size',
    'Number of tasks in the queue',
    ['queue_name']      # Label to identify different queues
)

# Set, increment, decrement operations
active_connections.set(5)   # Set to absolute value
active_connections.inc()    # Now 6 (increment by 1)
active_connections.dec()    # Now 5 (decrement by 1)

# With labels - track multiple queues independently
queue_size.labels(queue_name='email').set(42)         # Email queue has 42 items
queue_size.labels(queue_name='notifications').set(18)  # Notifications has 18
```

### Histogram Example

Histograms track the distribution of values by counting observations in configurable buckets. They're essential for latency percentiles (p50, p95, p99):

```python
from prometheus_client import Histogram
import time

# Create histogram with custom buckets for latency ranges
# Buckets define the upper bounds; Prometheus counts observations <= each bound
request_latency = Histogram(
    'request_latency_seconds',
    'Request latency in seconds',
    ['endpoint'],
    # Custom buckets optimized for web request latencies
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Manual timing with observe()
def process_request(endpoint):
    start_time = time.time()

    # Do processing
    result = do_actual_work()

    # Record the latency - goes into appropriate bucket
    duration = time.time() - start_time
    request_latency.labels(endpoint=endpoint).observe(duration)

    return result

# Or use the built-in timer decorator for cleaner code
# Automatically measures duration and records it
@request_latency.labels(endpoint='/api/users').time()
def get_users():
    return fetch_users_from_db()
```

### Summary Example

Summaries provide quantiles directly:

```python
from prometheus_client import Summary

# Create summary with quantiles
response_size = Summary(
    'response_size_bytes',
    'Response size in bytes',
    ['content_type']
)

# Record observations
response_size.labels(content_type='application/json').observe(1024)
response_size.labels(content_type='text/html').observe(4096)
```

---

## Flask Integration

Here's a complete Flask application with comprehensive metrics:

```python
# app.py
from flask import Flask, request, jsonify, g
from prometheus_client import (
    Counter, Histogram, Gauge,
    generate_latest, CONTENT_TYPE_LATEST
)
import time

app = Flask(__name__)

# Define metrics
REQUEST_COUNT = Counter(
    'flask_request_count',
    'Total request count',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'flask_request_latency_seconds',
    'Request latency in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_REQUESTS = Gauge(
    'flask_active_requests',
    'Number of active requests'
)

DB_QUERY_LATENCY = Histogram(
    'db_query_latency_seconds',
    'Database query latency',
    ['operation', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5]
)

USERS_CREATED = Counter(
    'users_created_total',
    'Total users created',
    ['source']
)

CACHE_OPERATIONS = Counter(
    'cache_operations_total',
    'Cache operations',
    ['operation', 'result']
)


@app.before_request
def before_request():
    """Track request start time and active requests"""
    g.start_time = time.time()
    ACTIVE_REQUESTS.inc()


@app.after_request
def after_request(response):
    """Record metrics after each request"""
    # Calculate latency
    latency = time.time() - g.start_time

    # Get endpoint (use rule or path)
    endpoint = request.url_rule.rule if request.url_rule else request.path

    # Record metrics
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=endpoint
    ).observe(latency)

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status=str(response.status_code)
    ).inc()

    ACTIVE_REQUESTS.dec()

    return response


@app.route('/metrics')
def metrics():
    """Expose metrics endpoint for Prometheus scraping"""
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}


@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user with metrics"""
    data = request.json

    # Track user creation source
    source = data.get('source', 'web')

    # Simulate database operation with timing
    with DB_QUERY_LATENCY.labels(operation='INSERT', table='users').time():
        user = save_user_to_db(data)

    # Increment user counter
    USERS_CREATED.labels(source=source).inc()

    return jsonify(user), 201


@app.route('/api/users/<user_id>')
def get_user(user_id):
    """Get user with cache metrics"""
    # Check cache
    cached_user = check_cache(user_id)

    if cached_user:
        CACHE_OPERATIONS.labels(operation='get', result='hit').inc()
        return jsonify(cached_user)

    CACHE_OPERATIONS.labels(operation='get', result='miss').inc()

    # Query database
    with DB_QUERY_LATENCY.labels(operation='SELECT', table='users').time():
        user = get_user_from_db(user_id)

    if user:
        # Store in cache
        CACHE_OPERATIONS.labels(operation='set', result='success').inc()
        store_in_cache(user_id, user)

    return jsonify(user) if user else ('Not found', 404)


@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})


# Helper functions (simulated)
def save_user_to_db(data):
    time.sleep(0.05)  # Simulate DB latency
    return {'id': '123', **data}

def get_user_from_db(user_id):
    time.sleep(0.02)  # Simulate DB latency
    return {'id': user_id, 'name': 'John Doe'}

def check_cache(key):
    return None  # Simulate cache miss

def store_in_cache(key, value):
    pass


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## FastAPI Integration

FastAPI works excellently with Prometheus metrics:

```python
# main.py
from fastapi import FastAPI, Request, Response
from prometheus_client import (
    Counter, Histogram, Gauge, Info,
    generate_latest, CONTENT_TYPE_LATEST
)
from starlette.middleware.base import BaseHTTPMiddleware
import time
import asyncio

app = FastAPI(title="Metrics Demo API")

# Define metrics
REQUEST_COUNT = Counter(
    'fastapi_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'fastapi_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

REQUESTS_IN_PROGRESS = Gauge(
    'fastapi_requests_in_progress',
    'Requests currently being processed',
    ['method', 'endpoint']
)

ORDERS_TOTAL = Counter(
    'orders_total',
    'Total orders processed',
    ['status', 'payment_method']
)

ORDER_VALUE = Histogram(
    'order_value_dollars',
    'Order value in dollars',
    buckets=[10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
)

INVENTORY_LEVEL = Gauge(
    'inventory_level',
    'Current inventory level',
    ['product_id', 'warehouse']
)

APP_INFO = Info(
    'fastapi_app',
    'Application information'
)

# Set application info
APP_INFO.info({
    'version': '1.0.0',
    'environment': 'production'
})


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request metrics"""

    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint
        if request.url.path == '/metrics':
            return await call_next(request)

        method = request.method
        endpoint = request.url.path

        # Track in-progress requests
        REQUESTS_IN_PROGRESS.labels(method=method, endpoint=endpoint).inc()

        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise
        finally:
            # Record duration
            duration = time.time() - start_time
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)

            # Record request count
            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status_code=str(status_code)
            ).inc()

            # Decrement in-progress
            REQUESTS_IN_PROGRESS.labels(method=method, endpoint=endpoint).dec()

        return response


app.add_middleware(MetricsMiddleware)


@app.get('/metrics')
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


@app.post('/api/orders')
async def create_order(order: dict):
    """Create an order with business metrics"""

    # Record order value
    ORDER_VALUE.observe(order.get('total', 0))

    # Simulate processing
    await asyncio.sleep(0.1)

    # Record order
    ORDERS_TOTAL.labels(
        status='completed',
        payment_method=order.get('payment_method', 'unknown')
    ).inc()

    return {'order_id': 'ord_123', 'status': 'completed'}


@app.put('/api/inventory/{product_id}')
async def update_inventory(product_id: str, quantity: int, warehouse: str = 'main'):
    """Update inventory levels"""

    INVENTORY_LEVEL.labels(
        product_id=product_id,
        warehouse=warehouse
    ).set(quantity)

    return {'product_id': product_id, 'quantity': quantity}


@app.get('/health')
async def health():
    return {'status': 'healthy'}
```

---

## Business Metrics Examples

### E-commerce Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Sales metrics
sales_total = Counter(
    'sales_total',
    'Total sales',
    ['product_category', 'region']
)

revenue_dollars = Counter(
    'revenue_dollars_total',
    'Total revenue in dollars',
    ['product_category']
)

cart_value = Histogram(
    'cart_value_dollars',
    'Shopping cart value distribution',
    buckets=[10, 25, 50, 100, 200, 500, 1000]
)

checkout_duration = Histogram(
    'checkout_duration_seconds',
    'Time to complete checkout',
    ['payment_method'],
    buckets=[5, 10, 30, 60, 120, 300]
)

cart_abandonment = Counter(
    'cart_abandonment_total',
    'Cart abandonments',
    ['stage']  # 'cart', 'shipping', 'payment'
)

# Inventory metrics
stock_level = Gauge(
    'stock_level_items',
    'Current stock level',
    ['product_id', 'warehouse']
)

low_stock_products = Gauge(
    'low_stock_products_count',
    'Number of products with low stock'
)


def process_sale(product, category, region, price):
    """Record a sale"""
    sales_total.labels(product_category=category, region=region).inc()
    revenue_dollars.labels(product_category=category).inc(price)


def track_checkout(payment_method, duration, completed=True):
    """Track checkout metrics"""
    checkout_duration.labels(payment_method=payment_method).observe(duration)

    if not completed:
        cart_abandonment.labels(stage='payment').inc()
```

### API Performance Metrics

```python
from prometheus_client import Counter, Histogram, Gauge
from functools import wraps
import time

# API metrics
api_calls = Counter(
    'api_calls_total',
    'Total API calls',
    ['service', 'endpoint', 'status']
)

api_latency = Histogram(
    'api_latency_seconds',
    'API call latency',
    ['service', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

api_errors = Counter(
    'api_errors_total',
    'API errors',
    ['service', 'error_type']
)

rate_limit_hits = Counter(
    'rate_limit_hits_total',
    'Rate limit violations',
    ['endpoint', 'user_tier']
)

concurrent_requests = Gauge(
    'concurrent_api_requests',
    'Number of concurrent API requests',
    ['service']
)


def track_api_call(service: str, endpoint: str):
    """Decorator to track API calls"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            concurrent_requests.labels(service=service).inc()
            start_time = time.time()

            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                api_errors.labels(
                    service=service,
                    error_type=type(e).__name__
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                api_latency.labels(service=service, endpoint=endpoint).observe(duration)
                api_calls.labels(service=service, endpoint=endpoint, status=status).inc()
                concurrent_requests.labels(service=service).dec()

        return wrapper
    return decorator


# Usage
@track_api_call(service='payment', endpoint='charge')
async def charge_customer(customer_id: str, amount: float):
    # Payment processing logic
    pass
```

### Queue and Background Job Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Queue metrics
queue_size = Gauge(
    'job_queue_size',
    'Number of jobs in queue',
    ['queue_name', 'priority']
)

jobs_processed = Counter(
    'jobs_processed_total',
    'Total jobs processed',
    ['queue_name', 'status']
)

job_duration = Histogram(
    'job_duration_seconds',
    'Job processing duration',
    ['queue_name', 'job_type'],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

jobs_retried = Counter(
    'jobs_retried_total',
    'Jobs that required retry',
    ['queue_name', 'job_type']
)

job_failures = Counter(
    'job_failures_total',
    'Total job failures',
    ['queue_name', 'error_type']
)

workers_active = Gauge(
    'workers_active',
    'Number of active workers',
    ['queue_name']
)


class JobProcessor:
    def __init__(self, queue_name: str):
        self.queue_name = queue_name

    def process_job(self, job):
        """Process a job with metrics tracking"""
        job_type = job.get('type', 'unknown')

        with job_duration.labels(
            queue_name=self.queue_name,
            job_type=job_type
        ).time():
            try:
                result = self._execute_job(job)
                jobs_processed.labels(
                    queue_name=self.queue_name,
                    status='success'
                ).inc()
                return result
            except RetryableError as e:
                jobs_retried.labels(
                    queue_name=self.queue_name,
                    job_type=job_type
                ).inc()
                raise
            except Exception as e:
                job_failures.labels(
                    queue_name=self.queue_name,
                    error_type=type(e).__name__
                ).inc()
                jobs_processed.labels(
                    queue_name=self.queue_name,
                    status='failure'
                ).inc()
                raise

    def _execute_job(self, job):
        # Actual job execution
        pass
```

---

## Advanced Patterns

### Multi-Process Support

When running with Gunicorn or multiple processes:

```python
from prometheus_client import multiprocess, CollectorRegistry, generate_latest
from prometheus_client import Counter, CONTENT_TYPE_LATEST
import os

# Enable multiprocess mode via environment variable
# export PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus_multiproc

def get_metrics():
    """Generate metrics for multi-process setup"""
    registry = CollectorRegistry()
    multiprocess.MultiProcessCollector(registry)
    return generate_latest(registry)

# In your Flask/FastAPI app
@app.route('/metrics')
def metrics():
    return get_metrics(), 200, {'Content-Type': CONTENT_TYPE_LATEST}
```

Gunicorn configuration:

```python
# gunicorn.conf.py
import os

def child_exit(server, worker):
    from prometheus_client import multiprocess
    multiprocess.mark_process_dead(worker.pid)

# Set the multiprocess directory
os.environ['PROMETHEUS_MULTIPROC_DIR'] = '/tmp/prometheus_multiproc'
```

### Custom Collectors

For metrics that need to be computed on-demand:

```python
from prometheus_client.core import GaugeMetricFamily, CounterMetricFamily
from prometheus_client import REGISTRY

class DatabaseMetricsCollector:
    """Custom collector for database metrics"""

    def __init__(self, db_pool):
        self.db_pool = db_pool

    def collect(self):
        # Connection pool metrics
        pool_size = GaugeMetricFamily(
            'db_pool_size',
            'Database connection pool size',
            labels=['pool_name']
        )
        pool_size.add_metric(['primary'], self.db_pool.get_pool_size())
        yield pool_size

        # Active connections
        active_connections = GaugeMetricFamily(
            'db_active_connections',
            'Active database connections',
            labels=['pool_name']
        )
        active_connections.add_metric(['primary'], self.db_pool.get_active_count())
        yield active_connections

        # Query statistics
        queries_total = CounterMetricFamily(
            'db_queries_total',
            'Total database queries',
            labels=['operation']
        )
        stats = self.db_pool.get_query_stats()
        for operation, count in stats.items():
            queries_total.add_metric([operation], count)
        yield queries_total

# Register the collector
REGISTRY.register(DatabaseMetricsCollector(db_pool))
```

### Pushgateway for Batch Jobs

For short-lived batch jobs that can't be scraped:

```python
from prometheus_client import Counter, Gauge, Histogram, push_to_gateway, CollectorRegistry

def run_batch_job():
    # Create a new registry for this job
    registry = CollectorRegistry()

    # Define metrics for this job
    records_processed = Counter(
        'batch_records_processed_total',
        'Records processed in batch job',
        registry=registry
    )

    processing_duration = Gauge(
        'batch_processing_duration_seconds',
        'Batch job duration',
        registry=registry
    )

    import time
    start_time = time.time()

    # Process records
    for record in get_records():
        process_record(record)
        records_processed.inc()

    # Record duration
    processing_duration.set(time.time() - start_time)

    # Push metrics to gateway
    push_to_gateway(
        'pushgateway:9091',
        job='batch_processor',
        registry=registry
    )

run_batch_job()
```

---

## Prometheus Configuration

Configure Prometheus to scrape your application:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'python-app'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'pushgateway'
    static_configs:
      - targets: ['pushgateway:9091']
    honor_labels: true
```

---

## Best Practices

### 1. Use Consistent Naming

```python
# Good: Clear, consistent naming
http_requests_total
http_request_duration_seconds
database_connections_active

# Bad: Inconsistent, unclear naming
requests  # Too vague
httpRequestsTotal  # Wrong format
db_conn  # Abbreviated
```

### 2. Include Units in Names

```python
# Good: Units in metric name
request_duration_seconds
memory_usage_bytes
disk_free_gigabytes

# Bad: No units
request_duration  # Seconds? Milliseconds?
memory_usage  # Bytes? KB? MB?
```

### 3. Use Labels Wisely

```python
# Good: Bounded, meaningful labels
REQUEST_COUNT.labels(method='GET', endpoint='/api/users', status='200')

# Bad: High cardinality labels
REQUEST_COUNT.labels(user_id=user_id)  # Too many unique values
REQUEST_COUNT.labels(timestamp=time.time())  # Infinite cardinality
```

### 4. Document Your Metrics

```python
# Always include helpful descriptions
orders_total = Counter(
    'orders_total',
    'Total number of orders placed. Includes completed, cancelled, and pending orders.',
    ['status', 'payment_method', 'region']
)
```

---

## Conclusion

Custom metrics transform your Python applications from black boxes into transparent, observable systems. With prometheus_client:

- **Counters** track cumulative events like requests and errors
- **Gauges** monitor fluctuating values like queue sizes
- **Histograms** capture distributions for latency analysis
- **Business metrics** give insight into what matters to your users

Start with basic request metrics, then expand to cover your most critical business operations. The investment in metrics pays off quickly when debugging production issues.

---

*Ready to visualize your Python metrics? [OneUptime](https://oneuptime.com) integrates seamlessly with Prometheus, providing dashboards, alerts, and correlation with traces and logs for complete observability.*

**Related Reading:**
- [What are Metrics in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/view)
- [P50 vs P95 vs P99 Latency Percentiles](https://oneuptime.com/blog/post/2025-09-15-p50-vs-p95-vs-p99-latency-percentiles/view)
- [Connecting Metrics to Traces with Exemplars](https://oneuptime.com/blog/post/2025-09-22-connecting-metrics-to-traces-with-exemplars/view)
