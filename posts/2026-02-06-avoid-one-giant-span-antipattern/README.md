# How to Avoid the Anti-Pattern of Creating One Giant Span Instead of Breaking Work into Child Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracing, Span Design, Observability

Description: Learn why a single large span hides performance bottlenecks and how to break operations into meaningful child spans.

A surprisingly common pattern in OpenTelemetry-instrumented applications is wrapping an entire request handler or complex operation in a single span. The resulting trace has one long bar with no visibility into what happened inside it. When latency spikes, you know the operation was slow, but you have no idea which part of it caused the slowdown.

## The One-Span Problem

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def handle_order(order_data):
    with tracer.start_as_current_span("handle_order") as span:
        # All of this work happens inside one span
        user = validate_user(order_data["user_id"])
        inventory = check_inventory(order_data["items"])
        payment = charge_payment(order_data["payment"])
        shipment = create_shipment(order_data["address"])
        notification = send_confirmation(user.email)
        return {"order_id": shipment.order_id}
```

This trace looks like:

```
handle_order [=====================================] 850ms
```

When this operation takes 850ms, which step is responsible? Is it the payment gateway? The inventory check? The email notification? You simply cannot tell.

## Break It Into Child Spans

Each logical step should be its own span. The OpenTelemetry context propagation automatically creates parent-child relationships:

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def handle_order(order_data):
    with tracer.start_as_current_span("handle_order") as parent:
        parent.set_attribute("order.item_count", len(order_data["items"]))

        with tracer.start_as_current_span("validate_user") as span:
            span.set_attribute("user.id", order_data["user_id"])
            user = validate_user(order_data["user_id"])

        with tracer.start_as_current_span("check_inventory") as span:
            span.set_attribute("inventory.item_count", len(order_data["items"]))
            inventory = check_inventory(order_data["items"])

        with tracer.start_as_current_span("charge_payment") as span:
            span.set_attribute("payment.method", order_data["payment"]["method"])
            payment = charge_payment(order_data["payment"])

        with tracer.start_as_current_span("create_shipment") as span:
            shipment = create_shipment(order_data["address"])
            span.set_attribute("shipment.tracking_id", shipment.tracking_id)

        with tracer.start_as_current_span("send_confirmation") as span:
            span.set_attribute("notification.channel", "email")
            notification = send_confirmation(user.email)

        return {"order_id": shipment.order_id}
```

Now the trace shows:

```
handle_order        [=====================================] 850ms
  validate_user     [====]                                   50ms
  check_inventory        [=======]                          120ms
  charge_payment                  [===================]     450ms
  create_shipment                                      [==] 130ms
  send_confirmation                                      [=] 100ms
```

Immediately you can see that `charge_payment` is the bottleneck, taking 450ms out of the total 850ms.

## Guidelines for Span Granularity

Not every function call needs its own span. Here are the guidelines:

**Create a span when:**
- The operation involves I/O (database queries, HTTP calls, file reads)
- The operation is a meaningful business step (validate, charge, ship)
- The operation might be slow or fail independently
- You would want to see its duration in a trace

**Do not create a span when:**
- The operation is a pure computation that takes microseconds
- The function is a simple helper or utility
- Adding a span would create hundreds of spans per request
- The operation has no independent failure mode

## JavaScript Example

```javascript
const tracer = opentelemetry.trace.getTracer('order-service');

async function handleOrder(orderData) {
  return tracer.startActiveSpan('handle_order', async (parentSpan) => {
    try {
      const user = await tracer.startActiveSpan('validate_user', async (span) => {
        try {
          span.setAttribute('user.id', orderData.userId);
          return await validateUser(orderData.userId);
        } finally {
          span.end();
        }
      });

      const inventory = await tracer.startActiveSpan('check_inventory', async (span) => {
        try {
          return await checkInventory(orderData.items);
        } finally {
          span.end();
        }
      });

      const payment = await tracer.startActiveSpan('charge_payment', async (span) => {
        try {
          span.setAttribute('payment.method', orderData.payment.method);
          return await chargePayment(orderData.payment);
        } finally {
          span.end();
        }
      });

      return { orderId: payment.orderId };
    } finally {
      parentSpan.end();
    }
  });
}
```

## Using a Helper to Reduce Boilerplate

If the try/finally pattern gets repetitive, create a helper:

```javascript
async function withSpan(name, attributes, fn) {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }
      }
      return await fn(span);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage becomes cleaner
async function handleOrder(orderData) {
  return withSpan('handle_order', null, async () => {
    const user = await withSpan('validate_user', { 'user.id': orderData.userId }, () =>
      validateUser(orderData.userId)
    );
    const payment = await withSpan('charge_payment', null, () =>
      chargePayment(orderData.payment)
    );
    return { orderId: payment.orderId };
  });
}
```

## The Sweet Spot

Aim for 5 to 15 spans per trace for a typical request. This gives you enough granularity to identify bottlenecks without overwhelming your tracing backend with noise. If a single operation consistently shows up as slow, you can always add more child spans to that specific area to investigate further.

Breaking work into child spans is the difference between knowing that something is slow and knowing exactly what is slow. It is the whole point of distributed tracing.
