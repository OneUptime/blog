# How to Implement Span Events in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Events, Tracing, Observability, Debugging, Exceptions, Logging

Description: Learn how to use span events in OpenTelemetry to capture discrete occurrences within spans, including exceptions, checkpoints, and business events.

---

Spans represent operations over time. But within an operation, discrete events happen at specific moments: an exception is thrown, a cache miss occurs, a retry is attempted. Span events capture these moments without creating new spans, providing detailed context for debugging without cluttering your trace structure.

## What Are Span Events?

A span event is a timestamped annotation attached to a span. Each event has:
- A name (what happened)
- A timestamp (when it happened)
- Optional attributes (additional context)

Unlike child spans, events do not have duration. They represent a point in time, not a range.

## When to Use Events vs Child Spans

Use span events for:
- Exceptions and errors
- Cache hits and misses
- Retry attempts
- State transitions
- Checkpoints in long operations
- Business events (order created, payment processed)

Use child spans for:
- Operations with measurable duration
- Calls to external services
- Database queries
- Distinct logical units of work

## Adding Events in Different Languages

### Node.js

```javascript
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('checkout-service');

async function processOrder(order) {
  return tracer.startActiveSpan('process-order', async (span) => {
    try {
      span.setAttribute('order.id', order.id);
      span.setAttribute('order.total', order.total);

      // Add event for order validation start
      span.addEvent('order.validation.start', {
        'order.items_count': order.items.length,
      });

      const isValid = await validateOrder(order);

      // Add event for validation completion
      span.addEvent('order.validation.complete', {
        'validation.result': isValid ? 'passed' : 'failed',
      });

      if (!isValid) {
        span.addEvent('order.rejected', {
          'rejection.reason': 'validation_failed',
        });
        return { success: false, error: 'Invalid order' };
      }

      // Add event for payment processing start
      span.addEvent('payment.processing.start', {
        'payment.method': order.paymentMethod,
        'payment.amount': order.total,
      });

      const paymentResult = await processPayment(order);

      // Add event based on payment result
      span.addEvent('payment.processing.complete', {
        'payment.success': paymentResult.success,
        'payment.transaction_id': paymentResult.transactionId,
      });

      return { success: true, orderId: order.id };
    } catch (error) {
      // Record exception as special event
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Python

```python
from opentelemetry import trace
import time

tracer = trace.get_tracer('checkout-service')

def process_order(order):
    with tracer.start_as_current_span('process-order') as span:
        span.set_attribute('order.id', order['id'])
        span.set_attribute('order.total', order['total'])

        # Add event for validation start
        span.add_event('order.validation.start', {
            'order.items_count': len(order['items'])
        })

        is_valid = validate_order(order)

        # Add event for validation completion
        span.add_event('order.validation.complete', {
            'validation.result': 'passed' if is_valid else 'failed'
        })

        if not is_valid:
            span.add_event('order.rejected', {
                'rejection.reason': 'validation_failed'
            })
            return {'success': False, 'error': 'Invalid order'}

        # Add event for payment processing
        span.add_event('payment.processing.start', {
            'payment.method': order['payment_method'],
            'payment.amount': order['total']
        })

        try:
            payment_result = process_payment(order)
            span.add_event('payment.processing.complete', {
                'payment.success': payment_result['success'],
                'payment.transaction_id': payment_result.get('transaction_id')
            })
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise

        return {'success': True, 'order_id': order['id']}
```

### Go

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("checkout-service")

func ProcessOrder(ctx context.Context, order Order) (Result, error) {
    ctx, span := tracer.Start(ctx, "process-order")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.total", order.Total),
    )

    // Add event for validation start
    span.AddEvent("order.validation.start", trace.WithAttributes(
        attribute.Int("order.items_count", len(order.Items)),
    ))

    isValid, err := ValidateOrder(ctx, order)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return Result{}, err
    }

    // Add event for validation completion
    span.AddEvent("order.validation.complete", trace.WithAttributes(
        attribute.Bool("validation.result", isValid),
    ))

    if !isValid {
        span.AddEvent("order.rejected", trace.WithAttributes(
            attribute.String("rejection.reason", "validation_failed"),
        ))
        return Result{Success: false, Error: "Invalid order"}, nil
    }

    // Add event for payment processing
    span.AddEvent("payment.processing.start", trace.WithAttributes(
        attribute.String("payment.method", order.PaymentMethod),
        attribute.Float64("payment.amount", order.Total),
    ))

    paymentResult, err := ProcessPayment(ctx, order)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return Result{}, err
    }

    span.AddEvent("payment.processing.complete", trace.WithAttributes(
        attribute.Bool("payment.success", paymentResult.Success),
        attribute.String("payment.transaction_id", paymentResult.TransactionID),
    ))

    return Result{Success: true, OrderID: order.ID}, nil
}
```

### Java

```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.StatusCode;

public class OrderProcessor {
    private static final Tracer tracer = GlobalOpenTelemetry.getTracer("checkout-service");

    public Result processOrder(Order order) {
        Span span = tracer.spanBuilder("process-order").startSpan();

        try {
            span.setAttribute("order.id", order.getId());
            span.setAttribute("order.total", order.getTotal());

            // Add event for validation start
            span.addEvent("order.validation.start", Attributes.builder()
                .put("order.items_count", order.getItems().size())
                .build());

            boolean isValid = validateOrder(order);

            // Add event for validation completion
            span.addEvent("order.validation.complete", Attributes.builder()
                .put("validation.result", isValid ? "passed" : "failed")
                .build());

            if (!isValid) {
                span.addEvent("order.rejected", Attributes.builder()
                    .put("rejection.reason", "validation_failed")
                    .build());
                return new Result(false, "Invalid order");
            }

            // Add event for payment processing start
            span.addEvent("payment.processing.start", Attributes.builder()
                .put("payment.method", order.getPaymentMethod())
                .put("payment.amount", order.getTotal())
                .build());

            PaymentResult paymentResult = processPayment(order);

            // Add event for payment completion
            span.addEvent("payment.processing.complete", Attributes.builder()
                .put("payment.success", paymentResult.isSuccess())
                .put("payment.transaction_id", paymentResult.getTransactionId())
                .build());

            return new Result(true, order.getId());
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

## Recording Exceptions

Exceptions are a special type of event. OpenTelemetry provides a dedicated method that automatically captures stack traces:

```javascript
// Node.js
try {
  await riskyOperation();
} catch (error) {
  // This adds an event with:
  // - exception.type
  // - exception.message
  // - exception.stacktrace
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message });
  throw error;
}
```

```python
# Python
try:
    risky_operation()
except Exception as e:
    # Records exception details automatically
    span.record_exception(e)
    span.set_status(trace.StatusCode.ERROR, str(e))
    raise
```

## Event Patterns for Common Scenarios

### Retry Operations

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  return tracer.startActiveSpan('fetch-with-retry', async (span) => {
    span.setAttribute('http.url', url);
    span.setAttribute('retry.max_attempts', maxRetries);

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      span.addEvent('retry.attempt', {
        'retry.attempt_number': attempt,
        'retry.remaining': maxRetries - attempt,
      });

      try {
        const response = await fetch(url);
        span.addEvent('retry.success', {
          'retry.successful_attempt': attempt,
        });
        return response;
      } catch (error) {
        lastError = error;
        span.addEvent('retry.failed', {
          'retry.attempt_number': attempt,
          'error.message': error.message,
        });

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100;
          span.addEvent('retry.waiting', {
            'retry.delay_ms': delay,
          });
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    span.recordException(lastError);
    span.setStatus({ code: 2, message: 'Max retries exceeded' });
    throw lastError;
  });
}
```

### Cache Operations

```javascript
async function getFromCache(key) {
  return tracer.startActiveSpan('cache.get', async (span) => {
    span.setAttribute('cache.key', key);

    const cached = await cache.get(key);

    if (cached) {
      span.addEvent('cache.hit', {
        'cache.key': key,
        'cache.age_ms': Date.now() - cached.timestamp,
      });
      return cached.value;
    }

    span.addEvent('cache.miss', {
      'cache.key': key,
    });

    const value = await fetchFromSource(key);

    span.addEvent('cache.populated', {
      'cache.key': key,
      'cache.ttl_seconds': 3600,
    });

    await cache.set(key, { value, timestamp: Date.now() }, 3600);
    return value;
  });
}
```

### State Machines

```javascript
async function processWorkflow(workflow) {
  return tracer.startActiveSpan('workflow.process', async (span) => {
    span.setAttribute('workflow.id', workflow.id);
    span.setAttribute('workflow.initial_state', workflow.state);

    const transitions = [];

    while (!workflow.isComplete()) {
      const previousState = workflow.state;
      const nextState = await workflow.advance();

      transitions.push({ from: previousState, to: nextState });

      span.addEvent('workflow.state.transition', {
        'state.from': previousState,
        'state.to': nextState,
        'transition.number': transitions.length,
      });
    }

    span.addEvent('workflow.complete', {
      'workflow.final_state': workflow.state,
      'workflow.total_transitions': transitions.length,
    });

    span.setAttribute('workflow.final_state', workflow.state);
    return workflow;
  });
}
```

### Long-Running Operations with Checkpoints

```javascript
async function processLargeFile(file) {
  return tracer.startActiveSpan('file.process', async (span) => {
    span.setAttribute('file.name', file.name);
    span.setAttribute('file.size_bytes', file.size);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let processedChunks = 0;

    span.addEvent('processing.started', {
      'total_chunks': totalChunks,
      'chunk_size': CHUNK_SIZE,
    });

    for await (const chunk of file.chunks()) {
      await processChunk(chunk);
      processedChunks++;

      // Add checkpoint events every 10%
      const progress = Math.floor((processedChunks / totalChunks) * 100);
      if (progress % 10 === 0) {
        span.addEvent('processing.checkpoint', {
          'progress_percent': progress,
          'chunks_processed': processedChunks,
          'chunks_remaining': totalChunks - processedChunks,
        });
      }
    }

    span.addEvent('processing.complete', {
      'total_chunks_processed': processedChunks,
    });
  });
}
```

## Event Naming Conventions

Follow consistent naming conventions for events:

- Use lowercase with dots as separators: `order.created`, `payment.failed`
- Include the domain and action: `cache.hit`, `retry.attempt`
- Be specific: `validation.schema.failed` not just `failed`
- Use consistent prefixes within a service

Example naming structure:
```
{domain}.{subject}.{action}

cache.item.hit
cache.item.miss
payment.authorization.started
payment.authorization.completed
payment.authorization.failed
order.validation.started
order.validation.passed
order.validation.failed
```

## Viewing Events in Traces

When you view a trace in an observability backend, events appear as points along the span timeline:

```
[Span: process-order] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      │         │              │         │
                      │         │              │         └─ payment.complete
                      │         │              └─ payment.start
                      │         └─ validation.complete
                      └─ validation.start
```

Events provide context without adding span overhead, making it easier to understand what happened during a span's execution.

## Performance Considerations

Events are lightweight but not free. Consider these guidelines:

1. **Avoid events in tight loops**: Add events at meaningful boundaries, not every iteration
2. **Limit attribute count**: Keep event attributes focused and relevant
3. **Truncate large values**: Do not attach large strings or objects as attributes
4. **Use sampling**: Events follow their parent span's sampling decision

```javascript
// Good: Event at meaningful boundary
for (const batch of batches) {
  await processBatch(batch);
}
span.addEvent('batches.processed', { count: batches.length });

// Avoid: Event per iteration
for (const batch of batches) {
  await processBatch(batch);
  span.addEvent('batch.processed'); // Too many events
}
```

## Conclusion

Span events provide a lightweight way to capture discrete occurrences within operations. Use them for exceptions, retries, cache interactions, state transitions, and business events. Combined with span attributes, events tell the complete story of what happened during a trace without the overhead of creating many small spans. Follow consistent naming conventions and be mindful of performance to get the most value from events in your observability practice.
