# How to Write an OpenTelemetry Instrumentation Guide for Your Engineering Team

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Documentation, Engineering Standards

Description: Learn how to write a practical OpenTelemetry instrumentation guide that helps your engineering team produce consistent, high-quality telemetry data.

Every engineering organization that adopts OpenTelemetry eventually hits the same wall: different teams instrument their services differently. One team adds dozens of span attributes, another barely adds any. Metric names drift across services. Log correlation is spotty at best. The fix is not more tooling. It is a clear, well-structured instrumentation guide that your team can actually follow.

This post walks through how to write one from scratch.

## Start with the Why

Before diving into code samples, your guide needs to explain why instrumentation matters. Engineers who understand the purpose behind telemetry will write better instrumentation than those who treat it as a checkbox.

Keep this section short. Something like:

> We instrument our services so that we can diagnose production issues quickly, understand service dependencies, and measure the performance of critical user journeys. Good instrumentation reduces our mean time to resolution and gives every engineer confidence when deploying changes.

## Define Your Instrumentation Layers

Your guide should describe three layers of instrumentation:

**Automatic instrumentation** covers HTTP servers, database clients, gRPC calls, and message queues. This is what the OpenTelemetry SDK provides out of the box.

**Framework-level instrumentation** covers patterns specific to your stack. For example, if your team uses a shared middleware library, document how it integrates with OpenTelemetry.

**Custom instrumentation** covers business logic spans, domain-specific attributes, and custom metrics. This is where most of your guide will focus.

## Provide Concrete Code Examples

Every rule in your guide should have an example. Here is how you might document span creation in a Node.js service:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service', '1.0.0');

// Good: descriptive span name following the convention <verb>.<noun>
async function processOrder(orderId: string, userId: string) {
  return tracer.startActiveSpan('process.order', async (span) => {
    // Always set domain-relevant attributes
    span.setAttribute('order.id', orderId);
    span.setAttribute('user.id', userId);

    try {
      const result = await executeOrderWorkflow(orderId);
      span.setAttribute('order.item_count', result.items.length);
      return result;
    } catch (error) {
      // Record the error on the span with full details
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

And show what bad instrumentation looks like, too:

```typescript
// Bad: vague span name, no attributes, no error handling
async function processOrder(orderId: string) {
  return tracer.startActiveSpan('doWork', async (span) => {
    const result = await executeOrderWorkflow(orderId);
    span.end();
    return result;
  });
}
```

Showing anti-patterns next to good patterns makes the expectations unmistakable.

## Cover Naming Conventions Explicitly

Dedicate a section to naming. Inconsistent names are the number one source of confusion when teams query telemetry data.

For spans:

- Use `<verb>.<noun>` format: `process.order`, `validate.payment`, `send.notification`
- Use lowercase with dots as separators
- Never include variable data in span names (no `process.order.12345`)

For metrics:

- Follow the OpenTelemetry semantic conventions as a baseline
- Use the pattern `<domain>.<entity>.<measurement>`: `orders.checkout.duration`, `orders.checkout.count`
- Always specify units in the metric description

For attributes:

- Prefix custom attributes with your domain: `order.id`, `order.status`, `payment.method`
- Never put high-cardinality data in metric attributes (trace attributes are fine)

## Document Context Propagation Rules

Many teams skip this section and then spend days debugging broken traces. Explain how context propagation works in your stack:

```python
# When calling another service via HTTP, context propagates automatically
# through the W3C Trace Context headers (traceparent, tracestate).
# No manual action needed if you use the OpenTelemetry HTTP instrumentation.

# When using a message queue, you need to inject context manually:
from opentelemetry import context, trace
from opentelemetry.propagators import inject

def publish_message(queue, message):
    headers = {}
    # Inject the current trace context into message headers
    inject(headers)
    queue.publish(message, headers=headers)
```

## Include a Decision Tree

Not every function needs a custom span. Add a simple decision tree:

1. Does this function make an external call (HTTP, DB, queue)? If automatic instrumentation covers it, you probably do not need a custom span.
2. Does this function represent a meaningful unit of business logic? Add a span.
3. Is this a hot path called thousands of times per second? Consider using metrics instead of spans to avoid overhead.
4. Do you need to correlate logs with traces? Make sure you are using the OpenTelemetry log bridge and that your logger is configured to inject trace context.

## Keep It Alive

The biggest risk is that your guide becomes stale. Treat it like code:

- Store it in your repository, not a wiki that nobody checks
- Assign ownership to a specific team or working group
- Review it quarterly and update examples when your stack changes
- Link it in your PR template so reviewers can reference it during code reviews

## Make Adoption Easy

Finally, pair your guide with starter code. Create a shared library or template that configures the OpenTelemetry SDK with your organization's defaults (exporters, samplers, resource attributes). When a developer creates a new service, they should get correct instrumentation with minimal effort.

A good instrumentation guide does not just tell engineers what to do. It removes ambiguity, reduces decision fatigue, and makes the right thing the easy thing. Write yours, put it where your team can find it, and iterate on it as your observability practice matures.
