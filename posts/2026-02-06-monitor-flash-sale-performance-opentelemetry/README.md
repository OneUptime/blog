# How to Monitor Flash Sale and High-Traffic Event Performance with OpenTelemetry Rate Metrics and Autoscaling Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Flash Sale, Autoscaling

Description: Monitor flash sale performance using OpenTelemetry rate metrics and autoscaling signals to handle traffic spikes.

Flash sales are controlled chaos. You announce a 70% off sale starting at noon, and within seconds your traffic goes from 500 requests per second to 50,000. The systems that handle this gracefully are the ones that have been instrumented to detect load patterns early and trigger scaling decisions before users start seeing errors.

OpenTelemetry plays a central role here. It collects the real-time rate metrics that drive autoscaling decisions, tracks error rates as systems approach their limits, and gives you the post-mortem data to understand what broke and when.

## Pre-Sale Instrumentation Setup

Before the sale starts, you need rate metrics and capacity gauges in place across every service in the critical path.

```python
from opentelemetry import trace, metrics

tracer = trace.get_tracer("ecommerce.storefront", "1.0.0")
meter = metrics.get_meter("ecommerce.storefront", "1.0.0")

# Request rate counter - this drives autoscaling
request_rate = meter.create_counter(
    name="http.requests_total",
    description="Total HTTP requests",
    unit="1"
)

# Track concurrent users as a gauge
active_sessions = meter.create_up_down_counter(
    name="storefront.active_sessions",
    description="Currently active user sessions",
    unit="1"
)

# Response latency histogram
response_latency = meter.create_histogram(
    name="http.response_latency_ms",
    description="HTTP response latency",
    unit="ms"
)

# Error rate counter
error_counter = meter.create_counter(
    name="http.errors_total",
    description="HTTP error responses",
    unit="1"
)

# Queue depth for background processing
queue_depth = meter.create_observable_gauge(
    name="storefront.queue_depth",
    description="Number of pending items in the order processing queue",
    callbacks=[lambda options: [metrics.Observation(order_queue.qsize())]],
    unit="1"
)

# Cart operations per second - key flash sale metric
cart_ops = meter.create_counter(
    name="storefront.cart_operations_total",
    description="Cart operations during the sale",
    unit="1"
)
```

## Request Middleware with Rate Tracking

```python
import time

async def flash_sale_middleware(request, call_next):
    """Middleware that tracks request rates and latency with sale context."""
    start = time.time()

    # Determine if this request is part of the flash sale
    is_sale_traffic = is_flash_sale_active() and is_sale_endpoint(request.path)

    request_rate.add(1, {
        "http.method": request.method,
        "http.route": request.path,
        "sale.active": is_sale_traffic,
        "sale.event_id": get_current_sale_id() if is_sale_traffic else "none"
    })

    if is_sale_traffic:
        active_sessions.add(1, {"sale.event_id": get_current_sale_id()})

    try:
        response = await call_next(request)

        latency_ms = (time.time() - start) * 1000
        response_latency.record(latency_ms, {
            "http.method": request.method,
            "http.route": request.path,
            "http.status_code": response.status_code,
            "sale.active": is_sale_traffic
        })

        if response.status_code >= 500:
            error_counter.add(1, {
                "http.route": request.path,
                "http.status_code": response.status_code,
                "sale.active": is_sale_traffic
            })

        return response

    except Exception as e:
        error_counter.add(1, {
            "http.route": request.path,
            "error.type": type(e).__name__,
            "sale.active": is_sale_traffic
        })
        raise
    finally:
        if is_sale_traffic:
            active_sessions.add(-1, {"sale.event_id": get_current_sale_id()})
```

## Cart and Checkout Under Load

During flash sales, the cart service is the hottest path. Instrument it to detect when it is approaching capacity.

```python
async def flash_sale_add_to_cart(user_id: str, product_id: str, quantity: int):
    with tracer.start_as_current_span("sale.add_to_cart") as span:
        span.set_attribute("sale.event_id", get_current_sale_id())
        span.set_attribute("product.id", product_id)
        span.set_attribute("cart.quantity", quantity)

        cart_ops.add(1, {
            "cart.operation": "add",
            "sale.event_id": get_current_sale_id()
        })

        # Check remaining sale inventory with circuit breaker
        with tracer.start_as_current_span("sale.check_sale_inventory") as inv_span:
            remaining = await sale_inventory_cache.get_remaining(product_id)
            inv_span.set_attribute("sale.remaining_stock", remaining)

            if remaining <= 0:
                span.set_attribute("sale.sold_out", True)
                return {"status": "sold_out"}

            # Atomic decrement with Redis for speed
            reserved = await sale_inventory_cache.decrement(product_id, quantity)
            if not reserved:
                return {"status": "sold_out"}

        # Persist to cart (async, non-blocking)
        with tracer.start_as_current_span("sale.persist_cart"):
            await cart_service.add_item_async(user_id, product_id, quantity)

        span.set_attribute("sale.add_result", "success")
        return {"status": "added"}
```

## Autoscaling Based on OpenTelemetry Metrics

Export your metrics to a system that can trigger Kubernetes HPA scaling decisions. Here is a collector config that feeds metrics to both your observability backend and a Prometheus endpoint for the HPA to scrape.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"
  prometheus:
    endpoint: "0.0.0.0:8889"  # Scraped by Prometheus for HPA

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp, prometheus]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Then configure the Kubernetes HPA to scale based on your request rate metric:

```yaml
# hpa-flash-sale.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: storefront-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: storefront
  minReplicas: 5
  maxReplicas: 100
  metrics:
    # Scale based on request rate per pod
    - type: Pods
      pods:
        metric:
          name: http_requests_total_rate
        target:
          type: AverageValue
          averageValue: "500"  # Target 500 rps per pod
    # Also scale on response latency
    - type: Pods
      pods:
        metric:
          name: http_response_latency_ms_p95
        target:
          type: AverageValue
          averageValue: "200"  # Scale up if P95 exceeds 200ms
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30  # React quickly during sale
      policies:
        - type: Percent
          value: 100  # Allow doubling pod count
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Slow scale-down after sale
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

## Real-Time Sale Dashboard

During a flash sale, your war room dashboard should show:

- **Requests per second**: Real-time, with a line showing when the sale started
- **Error rate percentage**: Should stay below 0.5% during healthy operations
- **P95 latency**: Anything above 500ms during a sale means you are losing customers
- **Pod count over time**: Shows autoscaling in action
- **Inventory drain rate**: How fast sale items are selling out
- **Cart abandonment spike**: Customers who added sale items but hit errors during checkout
- **Queue depth**: If background processing queues are growing faster than they drain, you have a bottleneck

## Post-Sale Analysis

After the sale ends, use the trace data to answer:

- What was the peak request rate, and how long did it take autoscaling to catch up?
- Which service was the bottleneck? (Usually the database or the inventory cache)
- How many customers saw errors, and at what point in their journey?
- Did the circuit breakers trip, and were they configured with the right thresholds?

Flash sales are the best stress tests you will ever run on your infrastructure. OpenTelemetry turns them from anxiety-inducing events into data-rich opportunities to improve your systems.
