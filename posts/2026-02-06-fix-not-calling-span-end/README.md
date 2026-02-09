# How to Fix the Mistake of Not Calling Span.End() and Why Your Traces Are Incomplete

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Spans, Tracing, Debugging

Description: Understand why missing Span.End() calls result in incomplete traces and learn reliable patterns to always close your spans.

When traces show up in your backend with gaps or missing operations, the cause is almost always the same: someone created a span but forgot to call `end()` on it. The span exists in memory, holding onto its data, but the span processor never receives it for export. This post explains the mechanics behind this problem and provides reliable solutions.

## How Spans Flow Through the SDK

Understanding the span lifecycle makes the problem obvious:

1. `tracer.startSpan()` creates a `Span` object in memory
2. You add attributes, events, and links to the span
3. `span.end()` records the end timestamp and passes the span to the `SpanProcessor`
4. The `BatchSpanProcessor` collects finished spans and sends them in batches to the exporter
5. The exporter transmits the data to your backend

Step 3 is the trigger. Without it, the span never reaches step 4 or 5. It just sits in memory until the application shuts down or the garbage collector eventually reclaims it (if there are no more references).

## Spotting the Symptom

In your tracing backend, look for these patterns:

- A parent span is missing but its children are present
- A trace has fewer spans than expected
- Duration calculations seem wrong because an intermediate span is absent
- The trace waterfall chart has orphaned child spans floating without a parent

## Common Code Paths That Skip span.end()

### Early Returns

```javascript
// Broken - early return skips span.end()
function processRequest(req) {
  const span = tracer.startSpan('processRequest');

  if (!req.body) {
    return { error: 'missing body' };  // span.end() never called
  }

  const result = handleBody(req.body);
  span.end();
  return result;
}
```

### Unhandled Promise Rejections

```javascript
// Broken - rejected promise skips span.end()
async function fetchData(url) {
  const span = tracer.startSpan('fetchData');
  const response = await fetch(url);  // throws on network error
  const data = await response.json();
  span.end();
  return data;
}
```

### Conditional Logic

```javascript
// Broken - one branch forgets span.end()
function route(request) {
  const span = tracer.startSpan('route');

  if (request.path === '/health') {
    span.end();
    return { status: 'ok' };
  }

  if (request.path === '/metrics') {
    return getMetrics();  // Forgot span.end() in this branch
  }

  const result = handleRequest(request);
  span.end();
  return result;
}
```

## The Fix: Always Use try/finally

The simplest and most reliable pattern is to wrap your span usage in a try/finally block:

```javascript
function processRequest(req) {
  const span = tracer.startSpan('processRequest');
  try {
    if (!req.body) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'missing body' });
      return { error: 'missing body' };
    }
    return handleBody(req.body);
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();  // Runs on return, throw, or normal completion
  }
}
```

For async functions:

```javascript
async function fetchData(url) {
  const span = tracer.startSpan('fetchData');
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Java: try-with-resources for Scope, finally for Span

In Java, the `Scope` and `Span` have different lifecycles. The scope controls context propagation, while the span must be explicitly ended:

```java
Span span = tracer.spanBuilder("processOrder").startSpan();
try (Scope scope = span.makeCurrent()) {
    // Your business logic here
    OrderResult result = orderService.process(order);
    return result;
} catch (Exception e) {
    span.setStatus(StatusCode.ERROR, e.getMessage());
    span.recordException(e);
    throw e;
} finally {
    span.end();
}
```

## Python: Context Managers

Python's `start_as_current_span` is a context manager that calls `end()` automatically:

```python
# This always calls span.end(), even if an exception occurs
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    result = order_service.process(order_id)
```

If you need more control, use the manual pattern with try/finally:

```python
span = tracer.start_span("process_order")
try:
    span.set_attribute("order.id", order_id)
    result = order_service.process(order_id)
except Exception as e:
    span.set_status(StatusCode.ERROR, str(e))
    span.record_exception(e)
    raise
finally:
    span.end()
```

## Linting for Missing span.end()

Consider adding a custom lint rule that flags any code path where `startSpan` is called without a corresponding `end()` in a finally block. For TypeScript projects, an ESLint rule can catch this:

```javascript
// .eslintrc.js - conceptual rule
// Flag startSpan calls that are not in a try/finally with span.end()
// This requires a custom ESLint plugin
```

While there is no off-the-shelf rule for this specific case, the pattern is simple enough to enforce in code reviews: if you see `startSpan` without `try/finally`, flag it.

## Summary

Every `startSpan()` needs a `span.end()`. Use try/finally in JavaScript and Java, use context managers in Python, and always handle error paths. Incomplete traces are almost always a sign that spans are being created but not ended somewhere in your code.
