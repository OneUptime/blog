# How to Avoid the Anti-Pattern of Instrumenting Every Function Instead of Meaningful Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Best Practices, Performance

Description: Learn why instrumenting every function creates noisy traces with thousands of spans and how to select meaningful operations instead.

When teams first adopt OpenTelemetry, there is a temptation to instrument everything. Every function, every method call, every utility gets a span. The result is traces with hundreds or thousands of spans per request, each one adding overhead to the application, filling up the tracing backend, and making it harder to find actual problems.

## The Over-Instrumentation Problem

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def handle_order(request):
    with tracer.start_as_current_span("handle_order"):
        data = parse_request(request)
        order = create_order(data)
        return format_response(order)

def parse_request(request):
    with tracer.start_as_current_span("parse_request"):
        body = read_body(request)
        return validate_fields(body)

def read_body(request):
    with tracer.start_as_current_span("read_body"):  # 0.01ms - why?
        return json.loads(request.body)

def validate_fields(body):
    with tracer.start_as_current_span("validate_fields"):  # 0.02ms - why?
        if not body.get("items"):
            raise ValueError("items required")
        return body

def create_order(data):
    with tracer.start_as_current_span("create_order"):
        order_id = generate_id(data)
        save_to_db(data, order_id)
        return {"id": order_id}

def generate_id(data):
    with tracer.start_as_current_span("generate_id"):  # 0.001ms - why?
        return uuid.uuid4().hex

def save_to_db(data, order_id):
    with tracer.start_as_current_span("save_to_db"):
        db.execute("INSERT INTO orders ...", data)

def format_response(order):
    with tracer.start_as_current_span("format_response"):  # 0.01ms - why?
        return {"status": "created", "order": order}
```

This produces 8 spans for a simple order creation. Four of those spans (`read_body`, `validate_fields`, `generate_id`, `format_response`) complete in microseconds and add no diagnostic value.

## The Cost of Excess Spans

Each span has a real cost:

- **Memory**: Each span object consumes a few hundred bytes in the SDK
- **CPU**: Context propagation, attribute serialization, and export processing
- **Network**: Every span is transmitted to the Collector
- **Storage**: Your tracing backend stores and indexes every span
- **Visual noise**: Engineers scrolling through a waterfall chart to find the slow operation amid dozens of sub-millisecond spans

At 1,000 requests per second with 8 spans each, you generate 8,000 spans per second. Cut that to 3 meaningful spans per request, and you are at 3,000 per second with much better signal.

## What to Instrument

Create spans for operations that are:

1. **I/O bound**: Database queries, HTTP calls, cache lookups, file reads, message queue operations
2. **Business-critical steps**: Payment processing, order validation, inventory checks
3. **Potentially slow**: Operations that could take variable time
4. **Cross-service boundaries**: Any call to another service
5. **Independently failing**: Operations that can fail for their own reasons

## What NOT to Instrument

Skip spans for:

1. **Pure computation**: String formatting, JSON parsing, math
2. **Simple getters/setters**: Property access, configuration lookups
3. **Utility functions**: Logging, formatting, type conversions
4. **Sub-millisecond operations**: Anything faster than 1ms is noise

## The Right Approach

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def handle_order(request):
    with tracer.start_as_current_span("handle_order") as span:
        data = parse_request(request)  # No span - pure computation
        span.set_attribute("order.item_count", len(data.get("items", [])))

        with tracer.start_as_current_span("save_order") as db_span:
            # This is I/O - worth a span
            order_id = uuid.uuid4().hex
            db.execute("INSERT INTO orders ...", data)
            db_span.set_attribute("db.operation", "INSERT")
            db_span.set_attribute("order.id", order_id)

        return {"status": "created", "order_id": order_id}
```

Two spans instead of eight. The trace shows:

```
handle_order  [========================] 45ms
  save_order    [==================]      38ms
```

You immediately see that the database write takes 38ms out of 45ms total. That is actionable information.

## Using Attributes Instead of Spans

When you want to record what happened inside an operation without creating a child span, use attributes and events:

```python
def handle_order(request):
    with tracer.start_as_current_span("handle_order") as span:
        # Record as attributes, not child spans
        data = parse_request(request)
        span.set_attribute("request.valid", True)
        span.set_attribute("order.item_count", len(data["items"]))

        # Record timing of sub-steps as events
        import time
        start = time.time()
        result = payment_gateway.charge(data["payment"])
        duration_ms = (time.time() - start) * 1000
        span.add_event("payment_completed", {
            "payment.duration_ms": duration_ms,
            "payment.method": data["payment"]["method"],
        })

        return result
```

## A Decision Tree

For each function you are considering instrumenting:

```
Does it involve I/O (network, disk, database)?
  YES -> Create a span
  NO  -> Does it represent a meaningful business step?
    YES -> Create a span
    NO  -> Does it take more than 5ms typically?
      YES -> Create a span
      NO  -> Use attributes or events on the parent span
```

## The Sweet Spot

Aim for 3 to 15 spans per request in a typical web service. This gives you enough detail to identify bottlenecks without drowning in noise. If you need to investigate a specific slow operation, you can always add more spans temporarily and remove them after the investigation.

Fewer, meaningful spans are better than more noisy ones. Instrument the operations that matter and let the rest live as attributes on their parent span.
