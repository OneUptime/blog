# How to Fix the Common Mistake of Forgetting to Close Spans and Leaking Memory in Your Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Memory Leaks, Spans, Best Practices

Description: Discover how unclosed OpenTelemetry spans cause memory leaks and learn patterns to ensure every span is properly closed.

Spans that are created but never ended are one of the most common sources of memory leaks in OpenTelemetry-instrumented applications. The span object stays in memory, the batch processor never picks it up for export, and over time your application's memory usage climbs steadily. This post covers how to detect unclosed spans and the patterns that prevent them.

## How Unclosed Spans Leak Memory

When you call `tracer.start_span()` or `tracer.startSpan()`, the SDK allocates a span object that holds attributes, events, timestamps, and a reference to the parent span context. This object stays alive until `span.end()` is called, at which point it gets handed to the span processor for batching and export.

If `span.end()` is never called:
- The span object lives forever in the application's heap
- The batch processor never sees it, so it never gets exported
- The trace in your backend shows a gap where the span should be
- If the unclosed span is a parent, child spans may export with broken parent references

## The Broken Pattern

Here is a common mistake where error paths skip the span ending:

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_payment(order):
    span = tracer.start_span("process_payment")
    span.set_attribute("order.id", order.id)

    result = payment_gateway.charge(order.amount)

    if result.failed:
        # Developer returns early, forgetting to end the span
        return None

    span.end()
    return result
```

Every failed payment leaks a span object. Over thousands of requests, this adds up.

## Fix 1: Use Context Managers (Python)

Python's `with` statement guarantees the span is ended when the block exits, whether normally or through an exception:

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_payment(order):
    # The context manager calls span.end() automatically
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order.id)

        result = payment_gateway.charge(order.amount)

        if result.failed:
            span.set_attribute("payment.status", "failed")
            return None

        span.set_attribute("payment.status", "success")
        return result
```

## Fix 2: Use try/finally (JavaScript)

JavaScript does not have context managers, but `try/finally` gives you the same guarantee:

```javascript
const tracer = opentelemetry.trace.getTracer('order-service');

async function processPayment(order) {
  const span = tracer.startSpan('process_payment');
  span.setAttribute('order.id', order.id);

  try {
    const result = await paymentGateway.charge(order.amount);

    if (result.failed) {
      span.setAttribute('payment.status', 'failed');
      return null;
    }

    span.setAttribute('payment.status', 'success');
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();  // Always called, no matter what happens above
  }
}
```

## Fix 3: Use the startActiveSpan Helper (JavaScript)

The `startActiveSpan` method wraps your code in a callback and manages the span lifecycle:

```javascript
const tracer = opentelemetry.trace.getTracer('order-service');

async function processPayment(order) {
  return tracer.startActiveSpan('process_payment', async (span) => {
    try {
      span.setAttribute('order.id', order.id);
      const result = await paymentGateway.charge(order.amount);
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

Note that even with `startActiveSpan`, you still need to call `span.end()` yourself. The callback approach just makes sure the span is set as the active span in the context.

## Fix 4: Use try-with-resources (Java)

Java's `Scope` object implements `AutoCloseable`, so you can use try-with-resources:

```java
Tracer tracer = GlobalOpenTelemetry.getTracer("order-service");

public PaymentResult processPayment(Order order) {
    Span span = tracer.spanBuilder("process_payment")
        .setAttribute("order.id", order.getId())
        .startSpan();

    // Make this span the current span
    try (Scope scope = span.makeCurrent()) {
        PaymentResult result = paymentGateway.charge(order.getAmount());
        return result;
    } catch (Exception e) {
        span.setStatus(StatusCode.ERROR, e.getMessage());
        span.recordException(e);
        throw e;
    } finally {
        span.end();  // Always end the span
    }
}
```

## Detecting Unclosed Spans

To find unclosed spans in your application, look for these symptoms:

1. **Steadily increasing memory usage** that does not correlate with request volume
2. **Traces with missing spans** in your backend, where you can see child spans but the parent is absent
3. **Batch processor warnings** about queue capacity being reached

You can also add a diagnostic check by monitoring the span processor:

```javascript
// Log the number of pending spans periodically
setInterval(() => {
  const pendingSpans = spanProcessor._finishedSpans?.length || 0;
  console.log(`Pending spans in batch processor: ${pendingSpans}`);
}, 30000);
```

If the pending count grows without bound, you likely have unclosed spans somewhere.

## The Rule of Thumb

Every `startSpan()` must have a matching `end()`. Use your language's resource management features (context managers, try/finally, try-with-resources) to make this automatic rather than relying on manual calls that can be forgotten in edge cases.
