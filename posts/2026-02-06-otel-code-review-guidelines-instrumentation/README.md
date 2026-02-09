# How to Establish OpenTelemetry Code Review Guidelines for Instrumentation Quality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Code Review, Instrumentation Quality, Best Practices

Description: Establish clear code review guidelines that help your team catch instrumentation issues before they reach production and degrade observability.

Code reviews are the last line of defense before bad instrumentation reaches production. But most teams do not have explicit guidelines for reviewing OpenTelemetry code. Reviewers check business logic, error handling, and test coverage, then glance at the instrumentation code and approve without much thought. The result is inconsistent telemetry that makes debugging harder instead of easier.

Here is how to build review guidelines that raise the bar.

## The Instrumentation Review Checklist

Add this checklist to your pull request template. Reviewers should check each item when the PR includes instrumentation changes:

```markdown
### Instrumentation Review
- [ ] Span names follow `<verb>.<noun>` convention
- [ ] No variable data in span names (IDs, timestamps, user input)
- [ ] Required attributes are set (see attribute registry)
- [ ] Error handling sets span status and records exceptions
- [ ] Spans are ended in all code paths (including error paths)
- [ ] No high-cardinality values in metric attributes
- [ ] Context propagation is preserved across async boundaries
- [ ] New metrics follow the naming convention
```

## Guideline 1: Span Naming

This is the most common mistake. Reviewers should reject any span name that includes variable data:

```python
# REJECT: span name contains a variable ID
# This creates thousands of unique span names, breaking aggregation
with tracer.start_as_current_span(f"process-order-{order_id}") as span:
    pass

# ACCEPT: span name is a fixed, descriptive string
# The variable goes in an attribute
with tracer.start_as_current_span("order.process") as span:
    span.set_attribute("order.id", order_id)
```

During review, search for f-strings, string concatenation, or template literals inside span name arguments. These are almost always wrong.

## Guideline 2: Error Handling on Spans

Every span that wraps code which can fail must handle errors properly. This is the second most common mistake:

```go
// REJECT: error is not recorded on the span
func processPayment(ctx context.Context, paymentID string) error {
    ctx, span := tracer.Start(ctx, "payment.process")
    defer span.End()

    err := chargeCard(ctx, paymentID)
    if err != nil {
        return err  // Span shows as successful even though it failed
    }
    return nil
}

// ACCEPT: error is recorded with status and exception details
func processPayment(ctx context.Context, paymentID string) error {
    ctx, span := tracer.Start(ctx, "payment.process")
    defer span.End()

    span.SetAttributes(attribute.String("payment.id", paymentID))

    err := chargeCard(ctx, paymentID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    span.SetStatus(codes.Ok, "")
    return nil
}
```

Reviewers should look for every error return path and verify the span is updated before the error propagates.

## Guideline 3: Span Lifecycle

Spans must be ended in all code paths. In languages without defer/finally patterns, this is easy to get wrong:

```java
// REJECT: span is not ended if an exception is thrown before span.end()
Span span = tracer.spanBuilder("inventory.check").startSpan();
try (Scope scope = span.makeCurrent()) {
    Result result = checkInventory(itemId);
    span.setAttribute("inventory.available", result.isAvailable());
    span.end();  // Never reached if checkInventory throws
    return result;
} catch (Exception e) {
    throw e;  // Span is leaked
}

// ACCEPT: span.end() is in finally block
Span span = tracer.spanBuilder("inventory.check").startSpan();
try (Scope scope = span.makeCurrent()) {
    Result result = checkInventory(itemId);
    span.setAttribute("inventory.available", result.isAvailable());
    return result;
} catch (Exception e) {
    span.recordException(e);
    span.setStatus(StatusCode.ERROR, e.getMessage());
    throw e;
} finally {
    span.end();  // Always called
}
```

## Guideline 4: Attribute Cardinality

High-cardinality attributes in metrics cause storage explosion. Reviewers must check metric attributes carefully:

```typescript
// REJECT: user_id as a metric attribute creates millions of time series
ordersCounter.add(1, {
  'order.type': orderType,
  'user.id': userId,  // High cardinality - do NOT use in metrics
});

// ACCEPT: only low-cardinality attributes on metrics
// Put user.id on the span instead, where high cardinality is acceptable
ordersCounter.add(1, {
  'order.type': orderType,    // ~3 possible values
  'payment.method': method,   // ~5 possible values
});
```

A good rule of thumb: if an attribute can have more than 100 unique values, it should not be on a metric. It belongs on a span or log instead.

## Guideline 5: Context Propagation

When code crosses async boundaries or uses message queues, context propagation breaks silently. Reviewers should look for these patterns:

```python
import asyncio
from opentelemetry import context

# REJECT: spawning a task without propagating context
async def handle_request(order_id):
    with tracer.start_as_current_span("order.process") as span:
        # This task runs in a new context - the span will not be linked
        asyncio.create_task(send_confirmation(order_id))

# ACCEPT: capture and attach context to the new task
async def handle_request(order_id):
    with tracer.start_as_current_span("order.process") as span:
        ctx = context.get_current()
        asyncio.create_task(send_confirmation_with_context(order_id, ctx))

async def send_confirmation_with_context(order_id, ctx):
    context.attach(ctx)
    with tracer.start_as_current_span("notification.send_confirmation") as span:
        span.set_attribute("order.id", order_id)
        await do_send(order_id)
```

## Automating What You Can

Some guidelines can be enforced automatically with linters:

```yaml
# .eslintrc.yaml - custom rules for OpenTelemetry
rules:
  # Ban template literals in span names
  no-restricted-syntax:
    - error
    - selector: "CallExpression[callee.property.name='startActiveSpan'] > TemplateLiteral"
      message: "Span names must be static strings, not template literals"
```

For patterns that are hard to lint, use code review as the enforcement mechanism. The checklist keeps reviewers consistent, and the guidelines give them concrete examples of what to accept and reject.

## Training Reviewers

Not every engineer knows what good instrumentation looks like. Run a 30-minute session showing real examples from your codebase of both good and bad instrumentation. Walk through the review checklist with real pull requests. After the session, engineers will spot issues instinctively.

Good instrumentation review is not about being pedantic. It is about protecting the quality of the telemetry data that your entire organization depends on for incident response. A five-minute review today prevents hours of debugging frustration next month.
