# How to Fix the Common Mistake of Forgetting to Close Spans and Leaking Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Memory Leak, Span, Best Practice

Description: Discover how unclosed OpenTelemetry spans cause memory leaks and learn patterns to ensure every span is properly closed.

Spans that are created but never ended are one of the common sources of missing telemetry and, when references or active context keep those spans alive, memory leaks in OpenTelemetry-instrumented applications. The batch processor never picks an unended span up for export, and over time your traces develop gaps where those spans should be. This post covers how to detect unclosed spans and the patterns that prevent them.

## How Unclosed Spans Leak Memory

When you call `tracer.start_span()` or `tracer.startSpan()`, the SDK allocates a span object that holds attributes, events, timestamps, and a reference to the parent span context. When `span.end()` is called, the span records its end timestamp and gets handed to the span processor for batching and export.

If `span.end()` is never called:
- The span may stay in the application's heap if active context or application code still references it
- The batch processor never sees it, so it never gets exported
- The trace in your backend shows a gap where the span should be
- If the unclosed span is a parent, child spans may export with a parent reference whose parent span is missing from the backend

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

Every failed payment leaves a span unended. If those spans are also kept alive by active context or application references, the memory retained can add up over thousands of requests.

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
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service');

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
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service');

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

public PaymentResult processPayment(Order order) throws Exception {
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

1. **Steadily increasing memory usage** when spans are also retained by active context, long-lived callbacks, or application data structures
2. **Traces with missing spans** in your backend, where you can see child spans but the parent is absent
3. **A growing count of started-but-not-ended spans** from a diagnostic span processor

You can also add a diagnostic check by registering a temporary span processor that tracks active span IDs:

```javascript
const activeSpans = new Set();

const diagnosticSpanProcessor = {
  onStart(span) {
    activeSpans.add(span.spanContext().spanId);
  },
  onEnd(span) {
    activeSpans.delete(span.spanContext().spanId);
  },
  forceFlush() {
    return Promise.resolve();
  },
  shutdown() {
    activeSpans.clear();
    return Promise.resolve();
  },
};

// Add diagnosticSpanProcessor to your SDK or tracer provider's
// spanProcessors list alongside your normal span processors.

setInterval(() => {
  console.log(`Started spans without a matching end: ${activeSpans.size}`);
}, 30000);
```

If this count grows without bound, you likely have unclosed spans somewhere.

## The Rule of Thumb

Every `startSpan()` must have a matching `end()`. Use your language's resource management features (context managers, try/finally, try-with-resources) to make this automatic rather than relying on manual calls that can be forgotten in edge cases.
