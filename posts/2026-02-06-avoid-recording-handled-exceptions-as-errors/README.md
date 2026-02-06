# How to Avoid the Anti-Pattern of Recording Every Exception as a Span Error Including Handled Ones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Handling, Spans, Best Practices

Description: Stop marking spans as errors for handled exceptions and learn when to use span status ERROR versus recording informational exceptions.

Not every exception is an error. Cache misses that throw exceptions, expected validation failures, and retry logic that catches and handles transient faults are all normal parts of application behavior. When you record all of these as span errors, your error rate metrics become meaningless. Your dashboards light up red even though the application is functioning correctly.

## The Problem

```python
from opentelemetry import trace

tracer = trace.get_tracer("user-service")

def get_user(user_id):
    with tracer.start_as_current_span("get_user") as span:
        try:
            # Try cache first
            user = cache.get(f"user:{user_id}")
        except CacheMissError as e:
            # This is expected behavior, not an error!
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, "Cache miss")  # Wrong!

            # Fall back to database
            user = db.query("SELECT * FROM users WHERE id = %s", user_id)
            cache.set(f"user:{user_id}", user)

        return user
```

In this code, every cache miss is recorded as an error. If your cache hit rate is 80%, then 20% of your spans are marked as errors. Your dashboards show a 20% error rate for a perfectly healthy service.

## The Fix: Distinguish Between Handled and Unhandled Exceptions

Only set `StatusCode.ERROR` on a span when the operation genuinely failed from the caller's perspective.

```python
from opentelemetry import trace

tracer = trace.get_tracer("user-service")

def get_user(user_id):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)

        try:
            user = cache.get(f"user:{user_id}")
            span.set_attribute("cache.hit", True)
        except CacheMissError:
            # Record as an event, not an error
            span.set_attribute("cache.hit", False)
            span.add_event("cache_miss", {"cache.key": f"user:{user_id}"})
            user = db.query("SELECT * FROM users WHERE id = %s", user_id)
            cache.set(f"user:{user_id}", user)

        return user
```

## When to Set StatusCode.ERROR

Set the span status to ERROR only when:

1. The operation failed and the caller will see a failure
2. An unhandled exception will propagate up
3. The business logic considers this a real failure

```python
def get_user(user_id):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)

        try:
            user = cache.get(f"user:{user_id}")
            span.set_attribute("cache.hit", True)
        except CacheMissError:
            span.set_attribute("cache.hit", False)
            try:
                user = db.query("SELECT * FROM users WHERE id = %s", user_id)
            except DatabaseError as e:
                # THIS is an actual error - the user won't get their data
                span.set_status(trace.StatusCode.ERROR, str(e))
                span.record_exception(e)
                raise

        return user
```

## JavaScript Example

```javascript
const { SpanStatusCode } = require('@opentelemetry/api');

async function getUser(userId) {
  return tracer.startActiveSpan('get_user', async (span) => {
    try {
      span.setAttribute('user.id', userId);

      let user;
      try {
        user = await cache.get(`user:${userId}`);
        span.setAttribute('cache.hit', true);
      } catch (cacheError) {
        // Expected - not an error
        span.setAttribute('cache.hit', false);
        span.addEvent('cache_miss', { 'cache.key': `user:${userId}` });
        user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      }

      return user;
    } catch (error) {
      // Unexpected failure - this IS an error
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Using Events for Informational Exceptions

Span events are the right tool for recording exceptions that were handled. They appear in the trace timeline without affecting error rates:

```python
# Record handled exception as an event (informational)
span.add_event("handled_exception", {
    "exception.type": type(e).__name__,
    "exception.message": str(e),
    "handling.action": "retry",
})

# vs. recording as an error (affects error rate)
span.record_exception(e)
span.set_status(trace.StatusCode.ERROR, str(e))
```

## A Decision Framework

Ask yourself these questions when deciding how to record an exception:

1. **Did the caller get the result they wanted?** If yes, it is not a span error.
2. **Is this exception part of normal control flow?** If yes (cache misses, validation rejections, retry logic), use events or attributes.
3. **Would a human need to investigate this?** If no, do not mark it as an error.
4. **Will the exception propagate up to the caller as a failure?** If yes, mark as error and record the exception.

## Impact on Alerting

When every handled exception is a span error, your alerting becomes useless:

```
# Alert that fires constantly because of cache misses
alert: HighErrorRate
expr: rate(span_errors_total[5m]) > 0.1
```

After fixing the handling:

```
# Alert that actually catches real problems
alert: HighErrorRate
expr: rate(span_errors_total[5m]) > 0.01
```

The error rate drops from 20% (cache misses + real errors) to 0.1% (only real errors), and now the alert actually means something.

## Summary

Reserve `StatusCode.ERROR` and `recordException` for genuine failures. Use span events and attributes for expected exceptions that are part of normal operation. Your error rate metrics will become meaningful, your dashboards will be useful, and your alerts will fire only when something is actually wrong.
