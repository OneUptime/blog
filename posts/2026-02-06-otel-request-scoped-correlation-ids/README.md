# How to Implement Request-Scoped Correlation IDs That Unify Traces, Logs, and Custom Business Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Correlation IDs, Request Scoping, Business Metrics, Observability

Description: Implement request-scoped correlation IDs that unify OpenTelemetry traces, structured logs, and custom business metrics for full request visibility.

A trace ID is technically a correlation ID, but it is opaque and changes with every request. Business teams want to track a specific order, a specific user session, or a specific payment across your entire system. Request-scoped correlation IDs that carry business meaning (like `order-id`, `session-id`, or `payment-ref`) provide this link. This post shows how to implement them so they appear consistently in traces, logs, and metrics.

## The Difference Between Trace ID and Business Correlation ID

A trace ID like `abc123def456789012345678abcdef00` is randomly generated and unique per request. It is great for linking spans together, but it does not carry business meaning. An on-call engineer can use it during debugging, but a product manager cannot use it to find out what happened with order #12345.

A business correlation ID like `order-12345` or `session-abc-xyz` carries meaning that both engineers and business stakeholders understand. The goal is to have this ID present in traces, logs, and metrics so you can search any signal by business context.

## Setting the Correlation ID at the Entry Point

Start by extracting or generating the correlation ID at the API gateway or the first service that handles the request:

```python
# gateway.py
import uuid
from opentelemetry import trace, baggage, context

tracer = trace.get_tracer("api-gateway")

def handle_request(request):
    # Extract business correlation IDs from request headers
    # or generate them if not present
    order_id = request.headers.get("X-Order-ID")
    session_id = request.headers.get("X-Session-ID")
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

    with tracer.start_as_current_span("gateway.handle_request") as span:
        # 1. Set as span attributes (appears in traces)
        span.set_attribute("correlation.id", correlation_id)
        if order_id:
            span.set_attribute("order.id", order_id)
        if session_id:
            span.set_attribute("session.id", session_id)

        # 2. Set as baggage (propagates to downstream services)
        ctx = baggage.set_baggage("correlation.id", correlation_id)
        if order_id:
            ctx = baggage.set_baggage("order.id", order_id, context=ctx)
        if session_id:
            ctx = baggage.set_baggage("session.id", session_id, context=ctx)

        token = context.attach(ctx)
        try:
            response = route_request(request)
            return response
        finally:
            context.detach(token)
```

## Downstream Services: Reading and Applying the Correlation ID

Every downstream service reads the correlation ID from baggage and applies it to all signals:

```python
# order_service.py
import logging
from opentelemetry import trace, baggage, metrics

tracer = trace.get_tracer("order-service")
meter = metrics.get_meter("order-service")
logger = logging.getLogger("order-service")

# Custom business metrics
order_value_histogram = meter.create_histogram(
    "order.value",
    unit="USD",
    description="Value of processed orders"
)
order_counter = meter.create_counter(
    "orders.processed",
    description="Number of orders processed"
)

def process_order(order):
    # Read correlation IDs from baggage
    correlation_id = baggage.get_baggage("correlation.id") or "unknown"
    order_id = baggage.get_baggage("order.id") or order.id

    with tracer.start_as_current_span("process_order") as span:
        # Set on span for trace correlation
        span.set_attribute("correlation.id", correlation_id)
        span.set_attribute("order.id", order_id)

        # Include in log records for log correlation
        logger.info(
            "Processing order",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "item_count": len(order.items),
            }
        )

        total = calculate_total(order)

        # Include in metric attributes for metric correlation
        order_value_histogram.record(total, {
            "order.id": order_id,
            "correlation.id": correlation_id,
            "order.type": order.type,
        })
        order_counter.add(1, {
            "order.type": order.type,
            # Note: do not include order_id in counter attributes
            # as it would create unbounded cardinality
            # Use it only in histogram exemplars instead
        })

        logger.info(
            "Order processed",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "total": total,
            }
        )

        return total
```

## Java Implementation

```java
// OrderService.java
import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public void processOrder(Order order) {
        // Read correlation IDs from baggage (set by upstream gateway)
        String correlationId = Baggage.current().getEntryValue("correlation.id");
        String orderId = Baggage.current().getEntryValue("order.id");

        // Set on current span
        Span span = Span.current();
        span.setAttribute("correlation.id", correlationId);
        span.setAttribute("order.id", orderId);

        // Set in MDC for structured logging
        MDC.put("correlation_id", correlationId);
        MDC.put("order_id", orderId);

        try {
            logger.info("Processing order with {} items", order.getItems().size());
            // ... business logic
            logger.info("Order processed, total: {}", order.getTotal());
        } finally {
            MDC.remove("correlation_id");
            MDC.remove("order_id");
        }
    }
}
```

## Collector-Side Automation with Baggage Processor

Instead of manually reading baggage in every service, use the collector's baggage processor to automatically convert baggage entries into span, log, and metric attributes:

```yaml
# collector-config.yaml
processors:
  baggage:
    rules:
      - baggage_key: "correlation.id"
        attribute_key: "correlation.id"
        action: "insert"
      - baggage_key: "order.id"
        attribute_key: "order.id"
        action: "insert"
      - baggage_key: "session.id"
        attribute_key: "session.id"
        action: "insert"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [baggage, batch]
      exporters: [otlp/traces]
    logs:
      receivers: [otlp]
      processors: [baggage, batch]
      exporters: [otlp/logs]
```

## Searching by Correlation ID

Once the correlation ID is in all three signals, searching becomes straightforward:

```
# Find traces for a specific order
TraceQL: { span.order.id = "order-12345" }

# Find logs for a specific order
LogQL: {service_name=~".+"} | json | order_id="order-12345"

# Find metrics for a specific correlation
# (Only works for high-cardinality backends or via exemplars)
# Use exemplars to jump from aggregate metrics to specific traces
```

## Handling Cardinality in Metrics

Business correlation IDs are high-cardinality by nature. Every order has a unique ID. You cannot use them as metric labels for counters and gauges without blowing up your metric backend. Here are the strategies:

```python
# Strategy 1: Use correlation IDs only in exemplars, not labels
order_counter.add(1, {
    "order.type": order.type,  # low cardinality: fine as label
    # order.id is NOT a label, but it appears in the exemplar
    # because a trace with that attribute is sampled
})

# Strategy 2: Use correlation IDs in histograms sparingly
# Histograms with exemplars can link to specific traces
order_value_histogram.record(total, {
    "order.type": order.type,
    # The exemplar automatically links to the current trace
    # which has order.id as a span attribute
})
```

```yaml
# Strategy 3: Collector-side filtering to prevent cardinality explosion
processors:
  transform/safe_metrics:
    metric_statements:
      - context: datapoint
        statements:
          # Remove high-cardinality attributes from metrics
          - delete_key(attributes, "order.id")
          - delete_key(attributes, "correlation.id")
          - delete_key(attributes, "session.id")
```

## Full Request Lifecycle Example

Here is what the full investigation looks like when a customer reports a problem with order #12345:

1. **Search logs**: `order_id="order-12345"` - find all log entries across all services
2. **Get trace ID**: from any log entry, extract the `trace_id`
3. **View trace**: open the trace to see the full request flow
4. **Check metrics**: use exemplars on the order value histogram to confirm the order amount
5. **Check profiles**: if the trace shows latency, click through to the profile for that span

All of this is connected by the `order.id` attribute that flows through every signal via baggage propagation.

## Wrapping Up

Request-scoped correlation IDs with business meaning bridge the gap between engineering observability and business operations. Set the ID at the entry point, propagate it via baggage, and ensure it appears in spans, logs, and metric exemplars. Use the collector's baggage processor to automate the attribute injection. Be careful with metric cardinality by keeping high-cardinality IDs out of metric labels and relying on exemplars for the link instead. The result is a system where anyone can search for a specific business transaction and see its complete story across every service and every signal.
