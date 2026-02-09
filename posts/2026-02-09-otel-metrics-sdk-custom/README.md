# How to use OpenTelemetry metrics SDK for custom metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, SDK, Observability, Monitoring

Description: Learn how to use the OpenTelemetry metrics SDK to create custom counters, gauges, and histograms for tracking application-specific metrics beyond auto-instrumentation.

---

The OpenTelemetry metrics SDK enables you to create custom metrics that track application-specific behavior. While auto-instrumentation captures standard metrics, custom metrics let you monitor business logic, performance indicators, and application state.

## Understanding Metric Instruments

OpenTelemetry provides several metric instruments for different use cases. Counters track cumulative values that only increase, gauges represent current values that go up and down, and histograms record distributions of values like latencies.

Each instrument type serves specific purposes. Choose counters for request counts and bytes processed, gauges for queue depths and memory usage, and histograms for latency and response sizes.

## Creating a Counter

Counters track cumulative values like total requests processed or items sold.

```python
# counter_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure metrics exporter
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)

# Create meter provider
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# Get meter for your application
meter = metrics.get_meter(__name__)

# Create counter
orders_counter = meter.create_counter(
    name="orders.created",
    description="Number of orders created",
    unit="1",
)

# Increment counter
def create_order(order_data):
    # Process order
    order_id = save_order(order_data)
    
    # Increment counter with attributes
    orders_counter.add(
        1,
        {"order.type": order_data["type"], "payment.method": order_data["payment"]}
    )
    
    return order_id

def save_order(data):
    return "order-123"

# Track multiple operations
payments_counter = meter.create_counter(
    name="payments.processed",
    description="Total payments processed",
    unit="USD",
)

def process_payment(amount, method):
    payments_counter.add(amount, {"payment.method": method})
```

## Creating an UpDownCounter

UpDownCounters track values that can increase or decrease, like active connections or items in a queue.

```python
# updowncounter_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Create up-down counter
active_users = meter.create_up_down_counter(
    name="users.active",
    description="Current number of active users",
    unit="1",
)

# Track user sessions
def user_login(user_id):
    # Increment on login
    active_users.add(1, {"session.type": "web"})
    
def user_logout(user_id):
    # Decrement on logout
    active_users.add(-1, {"session.type": "web"})

# Track queue depth
queue_depth = meter.create_up_down_counter(
    name="queue.depth",
    description="Number of items in processing queue",
    unit="1",
)

def enqueue_item(item):
    queue_depth.add(1, {"queue.name": "orders"})
    
def dequeue_item():
    queue_depth.add(-1, {"queue.name": "orders"})
```

## Creating a Histogram

Histograms record distributions of values, perfect for latency and size measurements.

```python
# histogram_metrics.py
from opentelemetry import metrics
import time

meter = metrics.get_meter(__name__)

# Create histogram for latency
request_duration = meter.create_histogram(
    name="http.server.duration",
    description="HTTP request duration",
    unit="ms",
)

# Record request latency
def handle_request(request):
    start_time = time.time()
    
    try:
        response = process_request(request)
        
        # Record duration
        duration_ms = (time.time() - start_time) * 1000
        request_duration.record(
            duration_ms,
            {
                "http.method": request.method,
                "http.route": request.path,
                "http.status_code": response.status_code,
            }
        )
        
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        request_duration.record(
            duration_ms,
            {
                "http.method": request.method,
                "http.route": request.path,
                "error": True,
            }
        )
        raise

def process_request(request):
    class Response:
        status_code = 200
    return Response()

# Create histogram for response sizes
response_size = meter.create_histogram(
    name="http.server.response.size",
    description="HTTP response body size",
    unit="bytes",
)

def send_response(response_data):
    size_bytes = len(str(response_data))
    response_size.record(size_bytes, {"content.type": "application/json"})
```

## Creating an Observable Gauge

Observable gauges report current values asynchronously through callback functions.

```python
# observable_gauge.py
from opentelemetry import metrics
import psutil

meter = metrics.get_meter(__name__)

# Create observable gauge for CPU usage
def get_cpu_usage(options):
    cpu_percent = psutil.cpu_percent(interval=1)
    yield metrics.Observation(cpu_percent, {"host": "server-01"})

cpu_gauge = meter.create_observable_gauge(
    name="system.cpu.usage",
    callbacks=[get_cpu_usage],
    description="Current CPU usage percentage",
    unit="%",
)

# Create observable gauge for memory
def get_memory_usage(options):
    memory = psutil.virtual_memory()
    yield metrics.Observation(memory.percent, {"type": "physical"})
    
    swap = psutil.swap_memory()
    yield metrics.Observation(swap.percent, {"type": "swap"})

memory_gauge = meter.create_observable_gauge(
    name="system.memory.usage",
    callbacks=[get_memory_usage],
    description="Current memory usage percentage",
    unit="%",
)

# Application-specific gauge
def get_queue_metrics(options):
    # Return multiple queue metrics
    yield metrics.Observation(get_queue_size("orders"), {"queue": "orders"})
    yield metrics.Observation(get_queue_size("notifications"), {"queue": "notifications"})

queue_gauge = meter.create_observable_gauge(
    name="app.queue.size",
    callbacks=[get_queue_metrics],
    description="Current queue size",
    unit="1",
)

def get_queue_size(queue_name):
    # Placeholder
    return 42
```

## Business Metrics

Track business-specific metrics that matter to your application.

```python
# business_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Revenue metrics
revenue_counter = meter.create_counter(
    name="revenue.total",
    description="Total revenue generated",
    unit="USD",
)

# Shopping cart metrics
cart_value_histogram = meter.create_histogram(
    name="cart.value",
    description="Shopping cart values",
    unit="USD",
)

abandoned_carts = meter.create_counter(
    name="carts.abandoned",
    description="Number of abandoned carts",
    unit="1",
)

# Track checkout process
def complete_checkout(cart_total, items_count, customer_segment):
    revenue_counter.add(
        cart_total,
        {
            "customer.segment": customer_segment,
            "payment.method": "credit_card",
        }
    )
    
    cart_value_histogram.record(
        cart_total,
        {"items.count.range": get_count_range(items_count)}
    )

def abandon_cart(cart_total, stage):
    abandoned_carts.add(
        1,
        {
            "cart.stage": stage,
            "cart.value.range": get_value_range(cart_total),
        }
    )

def get_count_range(count):
    if count <= 2:
        return "1-2"
    elif count <= 5:
        return "3-5"
    else:
        return "6+"

def get_value_range(value):
    if value < 50:
        return "0-50"
    elif value < 100:
        return "50-100"
    else:
        return "100+"
```

## Metric Views for Aggregation

Configure metric views to control aggregation and cardinality.

```python
# metric_views.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure custom histogram buckets
custom_histogram_view = View(
    instrument_name="http.server.duration",
    aggregation=metrics.ExplicitBucketHistogramAggregation(
        boundaries=[10, 50, 100, 200, 500, 1000, 2000, 5000]
    ),
)

# Drop high-cardinality attribute
filtered_view = View(
    instrument_name="requests.total",
    attribute_keys={"http.method", "http.route"},  # Only keep these attributes
)

# Create meter provider with views
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader], views=[custom_histogram_view, filtered_view])
metrics.set_meter_provider(provider)
```

## Complete Application Example

Integrate custom metrics into a complete application.

```python
# app_with_metrics.py
from flask import Flask, request
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

app = Flask(__name__)

# Configure metrics
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Define metrics
request_counter = meter.create_counter(
    "http.server.requests",
    description="Total HTTP requests",
)

request_duration = meter.create_histogram(
    "http.server.duration",
    description="HTTP request duration",
    unit="ms",
)

active_requests = meter.create_up_down_counter(
    "http.server.active_requests",
    description="Currently active requests",
)

@app.before_request
def before_request():
    request.start_time = time.time()
    active_requests.add(1, {"http.method": request.method})

@app.after_request
def after_request(response):
    # Record metrics
    duration_ms = (time.time() - request.start_time) * 1000
    
    attributes = {
        "http.method": request.method,
        "http.route": request.path,
        "http.status_code": response.status_code,
    }
    
    request_counter.add(1, attributes)
    request_duration.record(duration_ms, attributes)
    active_requests.add(-1, {"http.method": request.method})
    
    return response

@app.route("/api/products")
def get_products():
    return {"products": []}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

OpenTelemetry metrics SDK provides powerful instrumentation for custom application metrics. Use counters for cumulative values, gauges for current state, and histograms for distributions to gain comprehensive visibility into application behavior and business metrics.
