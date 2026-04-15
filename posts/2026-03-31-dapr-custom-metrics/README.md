# How to Implement Custom Metrics in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, OpenTelemetry, Prometheus, Observability

Description: Expose custom business metrics from Dapr services using OpenTelemetry SDK and scrape them with Prometheus alongside Dapr's built-in sidecar metrics.

---

## Dapr Metrics Architecture

Dapr sidecars expose Prometheus metrics on port 9090. Your application can expose additional custom metrics on a separate port, and both are scraped by Prometheus. OpenTelemetry SDK provides the instrumentation API.

## Adding OpenTelemetry Metrics SDK

```bash
pip install opentelemetry-sdk \
  opentelemetry-exporter-prometheus \
  opentelemetry-exporter-otlp-proto-http
```

## Defining Custom Metrics

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from prometheus_client import start_http_server

# Start Prometheus exporter on a dedicated port
start_http_server(9091)

reader = PrometheusMetricReader()
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("order-service", "1.0.0")

# Counter: total orders processed
orders_counter = meter.create_counter(
    "orders_processed_total",
    description="Total number of orders processed",
    unit="orders"
)

# Histogram: order processing duration
order_duration = meter.create_histogram(
    "order_processing_duration_seconds",
    description="Order processing duration in seconds",
    unit="s"
)

# Gauge: active orders in flight
active_orders = meter.create_up_down_counter(
    "orders_active",
    description="Number of orders currently being processed"
)

# Counter: revenue processed
revenue_counter = meter.create_counter(
    "revenue_processed_dollars",
    description="Total revenue in dollars processed",
    unit="$"
)
```

## Instrumenting Business Logic

```python
import time
from contextlib import contextmanager

@contextmanager
def track_order_processing(order: dict):
    start = time.time()
    active_orders.add(1, {"service": "order-service"})
    try:
        yield
        duration = time.time() - start
        orders_counter.add(1, {
            "status": "success",
            "payment_method": order.get("paymentMethod", "unknown"),
            "channel": order.get("channel", "web"),
        })
        order_duration.record(duration, {
            "status": "success",
            "customer_tier": order.get("customerTier", "free"),
        })
        revenue_counter.add(order.get("amount", 0), {
            "currency": order.get("currency", "USD"),
        })
    except Exception as e:
        orders_counter.add(1, {"status": "error", "error_type": type(e).__name__})
        raise
    finally:
        active_orders.add(-1, {"service": "order-service"})


async def process_order(order: dict):
    with track_order_processing(order):
        await validate_order(order)
        await charge_payment(order)
        await fulfill_order(order)
```

## Kubernetes PodMonitor for Dapr App Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: order-service-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  podMetricsEndpoints:
  # Dapr sidecar metrics
  - port: dapr-metrics
    path: /metrics
  # Application custom metrics
  - port: app-metrics
    path: /metrics
```

```yaml
# Expose both ports in your service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
      - name: order-service
        ports:
        - name: http
          containerPort: 8080
        - name: app-metrics
          containerPort: 9091
```

## Sample Prometheus Queries

```promql
# Order success rate
rate(orders_processed_total{status="success"}[5m]) /
rate(orders_processed_total[5m])

# p95 order processing duration
histogram_quantile(0.95, rate(order_processing_duration_seconds_bucket[5m]))

# Revenue per minute
rate(revenue_processed_dollars_total[1m]) * 60
```

## Summary

Custom metrics in Dapr applications use the OpenTelemetry SDK to define and record domain-specific measurements, then expose them via a Prometheus exporter. Prometheus scrapes both the Dapr sidecar metrics and your application metrics from the same pod. This gives you a unified metrics pipeline where infrastructure metrics (sidecar latency, pub/sub lag) sit alongside business metrics (order volume, revenue).
