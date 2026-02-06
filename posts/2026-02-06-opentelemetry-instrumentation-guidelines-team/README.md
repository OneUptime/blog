# How to Create OpenTelemetry Instrumentation Guidelines for Your Team

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Guidelines, Best Practices, Team Standards, Documentation

Description: Learn how to create practical OpenTelemetry instrumentation guidelines that help your team produce consistent, high-quality telemetry data across all services.

---

Giving a team the OpenTelemetry SDK without instrumentation guidelines is like giving them a programming language without a style guide. Each person will do things differently. One developer creates a span for every function call. Another only instruments the HTTP layer. A third adds 50 attributes to each span. The result is telemetry data that is noisy in some services, sparse in others, and inconsistent everywhere.

Instrumentation guidelines set expectations for what to instrument, how to instrument it, and what data to include. They reduce decision fatigue for developers and produce telemetry that is useful for everyone who needs to debug, monitor, and understand the system. This post provides a template for creating guidelines that actually get followed.

## What Guidelines Should Cover

Effective instrumentation guidelines answer these questions:

1. What operations should have spans?
2. What attributes should each span include?
3. How should errors be recorded?
4. What should not be instrumented?
5. How should custom metrics be named?
6. What are the rules for log correlation?

Let us build out each section.

## Span Creation Guidelines

Not every function needs a span. Too many spans create noise, increase costs, and make traces hard to read. Too few spans leave gaps that make debugging impossible. The sweet spot is instrumenting operations that cross boundaries or represent significant work.

```yaml
# instrumentation-guidelines.yaml
# What to instrument and what to skip.
spans:
  always_instrument:
    - HTTP request handlers (incoming requests)
    - HTTP client calls (outgoing requests)
    - Database queries
    - Message queue publish and consume operations
    - gRPC service methods
    - Cache operations (Redis, Memcached)
    - External API calls
    - Significant business logic operations (order processing, payment charging)

  never_instrument:
    - Simple getter/setter methods
    - Logging statements
    - Configuration loading
    - Health check endpoints (filter these at the collector)
    - Internal utility functions that complete in microseconds

  use_judgment:
    - Internal service method calls (instrument if they represent a logical unit of work)
    - Retry loops (instrument the overall retry, not each attempt)
    - Batch processing (instrument the batch, not each item)
```

### Code Examples

Here is what good instrumentation looks like in practice:

```python
# GOOD: Instrument meaningful operations with useful attributes
from opentelemetry import trace

tracer = trace.get_tracer("order-service", "1.0.0")

def process_order(order):
    # This span represents a significant business operation
    with tracer.start_as_current_span("OrderProcessor.processOrder") as span:
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.item_count", len(order.items))
        span.set_attribute("order.total_usd", order.total)

        # Validate the order
        validate_order(order)

        # Charge the payment (this will create its own span via auto-instrumentation)
        charge_result = payment_client.charge(order.payment_info)
        span.set_attribute("payment.status", charge_result.status)

        # Update inventory (database call creates its own span)
        update_inventory(order.items)

        return OrderResult(status="completed")
```

```python
# BAD: Over-instrumentation creates noise and cost
def process_order(order):
    with tracer.start_as_current_span("process_order"):
        # Do not create spans for trivial operations
        with tracer.start_as_current_span("get_order_id"):
            order_id = order.id

        with tracer.start_as_current_span("count_items"):
            item_count = len(order.items)

        with tracer.start_as_current_span("check_if_not_none"):
            if order is not None:
                pass
```

## Attribute Guidelines

Attributes provide the context that makes spans useful for debugging. But they also increase the size of each span and can accidentally leak sensitive data.

```yaml
# Attribute guidelines
attributes:
  required:
    # Every span from a business operation should include these
    - name: service.operation
      description: "The logical operation being performed"
      example: "createOrder"

  recommended:
    # Include these when available and relevant
    - name: user.id
      description: "The authenticated user ID (never PII like email)"
      example: "usr_abc123"
    - name: tenant.id
      description: "The tenant identifier for multi-tenant services"
      example: "tenant_xyz"

  forbidden:
    # Never include these in span attributes
    - Passwords or secrets
    - Full email addresses
    - Credit card numbers
    - Social security numbers
    - Raw request/response bodies (use a summary instead)
    - Personal names

  limits:
    # Practical limits to prevent span bloat
    max_attributes_per_span: 32
    max_attribute_value_length: 256
    max_array_length: 10
```

### Implementing Attribute Limits

Enforce attribute limits with a custom span processor:

```javascript
// AttributeLimitProcessor enforces attribute count and size limits.
// Add this processor to catch spans that exceed guidelines.
const { SpanProcessor } = require('@opentelemetry/sdk-trace-base');

class AttributeLimitProcessor {
  constructor(options = {}) {
    this.maxAttributes = options.maxAttributes || 32;
    this.maxValueLength = options.maxValueLength || 256;
  }

  onStart(span) {
    // Check will happen on end when all attributes are set
  }

  onEnd(span) {
    const attributes = span.attributes;
    const attrCount = Object.keys(attributes).length;

    if (attrCount > this.maxAttributes) {
      console.warn(
        `Span "${span.name}" has ${attrCount} attributes, ` +
        `exceeding the limit of ${this.maxAttributes}. ` +
        `Review your instrumentation.`
      );
    }

    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string' && value.length > this.maxValueLength) {
        console.warn(
          `Span "${span.name}" attribute "${key}" has value length ` +
          `${value.length}, exceeding limit of ${this.maxValueLength}.`
        );
      }
    }
  }

  shutdown() { return Promise.resolve(); }
  forceFlush() { return Promise.resolve(); }
}
```

## Error Recording Guidelines

How errors are recorded determines how useful your traces are for debugging:

```python
# Error recording guidelines with examples

# GOOD: Record the exception with full context
def process_payment(payment):
    span = trace.get_current_span()
    try:
        result = gateway.charge(payment)
        span.set_attribute("payment.status", "success")
        return result
    except PaymentDeclinedException as e:
        # Record as a business error with useful context
        span.set_attribute("payment.status", "declined")
        span.set_attribute("payment.decline_reason", e.reason)
        span.set_status(trace.StatusCode.ERROR, "Payment declined")
        span.record_exception(e)
        raise
    except GatewayTimeoutException as e:
        # Record infrastructure errors differently
        span.set_attribute("payment.status", "timeout")
        span.set_status(trace.StatusCode.ERROR, "Gateway timeout")
        span.record_exception(e)
        raise
```

```python
# BAD: Swallowing the error or providing no context
def process_payment(payment):
    try:
        return gateway.charge(payment)
    except Exception:
        # This loses all error context
        span = trace.get_current_span()
        span.set_status(trace.StatusCode.ERROR)
        return None
```

## Custom Metrics Guidelines

Define naming and unit conventions for custom metrics:

```yaml
# Custom metrics naming conventions
metrics:
  naming:
    pattern: "{service}.{domain}.{measurement}"
    examples:
      - "order_service.orders.created_total"
      - "order_service.orders.processing_duration_seconds"
      - "order_service.inventory.stock_level"

  rules:
    - Use snake_case for metric names
    - Include the unit in the metric name (seconds, bytes, total)
    - Use _total suffix for counters
    - Use _seconds or _milliseconds suffix for durations
    - Use _bytes suffix for sizes
    - Do not include the service name prefix (it is in the resource)

  instrument_types:
    counter: "For values that only increase (request count, errors)"
    histogram: "For values you want percentiles of (latency, size)"
    gauge: "For values that go up and down (queue depth, active connections)"
```

### Metric Examples

```python
# Custom metrics following the guidelines
from opentelemetry import metrics

meter = metrics.get_meter("order-service", "1.0.0")

# Counter for order events
orders_created = meter.create_counter(
    name="orders.created_total",
    description="Total number of orders created",
    unit="1",
)

# Histogram for processing duration
processing_duration = meter.create_histogram(
    name="orders.processing_duration_seconds",
    description="Time to process an order from submission to completion",
    unit="s",
)

# Gauge for current queue depth
queue_depth = meter.create_up_down_counter(
    name="orders.queue_depth",
    description="Number of orders waiting to be processed",
    unit="1",
)

def process_order(order):
    start_time = time.time()
    try:
        result = do_process(order)
        orders_created.add(1, {"order.type": order.type, "status": "success"})
        return result
    except Exception as e:
        orders_created.add(1, {"order.type": order.type, "status": "error"})
        raise
    finally:
        duration = time.time() - start_time
        processing_duration.record(duration, {"order.type": order.type})
```

## Log Correlation Guidelines

Ensure logs can be correlated with traces:

```python
# Log correlation: include trace_id and span_id in every log message.
# Most logging frameworks can be configured to do this automatically.
import logging
from opentelemetry import trace

class TraceContextFilter(logging.Filter):
    """Logging filter that adds trace context to log records."""
    def filter(self, record):
        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx.is_valid:
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
        else:
            record.trace_id = "00000000000000000000000000000000"
            record.span_id = "0000000000000000"
        return True

# Configure logging with the trace context filter
handler = logging.StreamHandler()
handler.addFilter(TraceContextFilter())
formatter = logging.Formatter(
    '%(asctime)s %(levelname)s [trace_id=%(trace_id)s span_id=%(span_id)s] %(message)s'
)
handler.setFormatter(formatter)
```

## Making Guidelines Stick

Guidelines only work if people follow them. Here are practical ways to drive adoption:

1. **Code review checklist.** Add instrumentation review to your PR checklist. Reviewers should check that new endpoints have spans, attributes follow conventions, and errors are recorded properly.

2. **Starter templates.** Provide copy-paste templates for common patterns (HTTP handler, database call, message consumer). Developers should not have to figure out the right way from scratch.

3. **Automated checks.** Run linters in CI that catch common violations. A warning in CI is more effective than a guideline document that nobody reads.

4. **Regular audits.** Quarterly, sample traces from each service and check if they follow the guidelines. Share results with teams.

## Conclusion

Instrumentation guidelines are the bridge between having OpenTelemetry installed and actually getting value from it. Without them, each developer makes their own decisions about what to instrument and how, leading to inconsistent and often low-quality telemetry. With clear guidelines covering span creation, attributes, error recording, metrics, and log correlation, your team produces telemetry that is useful for debugging, monitoring, and understanding the system. The guidelines should be practical, enforceable, and come with code examples that developers can copy directly.
