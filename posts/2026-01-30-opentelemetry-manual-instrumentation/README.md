# How to Implement OpenTelemetry Manual Instrumentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Tracing, Instrumentation

Description: Add custom spans, attributes, and events to your application code with OpenTelemetry manual instrumentation for detailed observability.

---

Auto-instrumentation handles common libraries out of the box, but production applications need more. You need to trace business logic, add domain-specific attributes, and capture events that matter to your team. That is where manual instrumentation comes in.

This guide walks through manual instrumentation in Node.js with TypeScript. Every example is production-ready code you can adapt to your codebase.

---

## Prerequisites and Setup

Install the required packages.

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/sdk-metrics
```

Create a telemetry initialization file that runs before your application code.

```typescript
// telemetry.ts
// This file must be imported FIRST, before any other modules

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.1.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  }),
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.shutdown();
  process.exit(0);
});

export { sdk };
```

Import this file at the very top of your entry point.

```typescript
// index.ts
import './telemetry'; // Must be first import
import { startServer } from './server';
startServer();
```

---

## Getting a Tracer

A tracer is your entry point for creating spans. Each tracer should have a unique name that identifies the instrumentation scope.

```typescript
// tracing.ts
import { trace, Tracer } from '@opentelemetry/api';

// Create a tracer with name and version
const tracer: Tracer = trace.getTracer('order-service', '2.1.0');

export { tracer };
```

| Tracer Property | Purpose | Example |
|-----------------|---------|---------|
| Name | Identifies the instrumentation scope | `'order-service'` |
| Version | Tracks instrumentation version | `'2.1.0'` |

---

## Creating Spans

Spans represent units of work in your application.

```typescript
import { tracer } from './tracing';

// Basic span creation
async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan('process-order');
  try {
    await validateOrder(orderId);
    await chargePayment(orderId);
  } finally {
    span.end(); // Always end spans
  }
}
```

Using `startActiveSpan` sets the span as active in the current context, so child spans automatically become children.

```typescript
async function processOrder(orderId: string): Promise<Order> {
  return tracer.startActiveSpan('process-order', async (span) => {
    try {
      const order = await fetchOrder(orderId);
      await chargePayment(order);
      return order;
    } finally {
      span.end();
    }
  });
}
```

Configure spans with options at creation time.

```typescript
import { SpanKind } from '@opentelemetry/api';

const span = tracer.startSpan('external-api-call', {
  kind: SpanKind.CLIENT, // Indicates outgoing request
  attributes: {
    'http.method': 'POST',
    'http.url': 'https://api.payment.com/charge',
  },
});
```

| Span Kind | Use Case |
|-----------|----------|
| `INTERNAL` | Default, internal operations |
| `SERVER` | Handling incoming requests |
| `CLIENT` | Making outgoing requests |
| `PRODUCER` | Sending messages to a queue |
| `CONSUMER` | Receiving messages from a queue |

---

## Adding Attributes to Spans

Attributes add context to spans for filtering and analysis.

```typescript
async function createUser(userData: UserInput): Promise<User> {
  return tracer.startActiveSpan('create-user', async (span) => {
    // Add attributes for debugging
    span.setAttribute('user.email_domain', userData.email.split('@')[1]);
    span.setAttribute('user.plan', userData.plan);

    const user = await db.users.create(userData);

    // Add attributes after operation
    span.setAttribute('user.id', user.id);
    span.setAttribute('db.rows_affected', 1);

    span.end();
    return user;
  });
}

// Set multiple attributes at once
span.setAttributes({
  'order.id': order.id,
  'order.total': order.total,
  'order.item_count': order.items.length,
});
```

Use semantic conventions for common attribute names.

```typescript
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

span.setAttributes({
  [SemanticAttributes.HTTP_METHOD]: 'POST',
  [SemanticAttributes.HTTP_STATUS_CODE]: 201,
  [SemanticAttributes.DB_SYSTEM]: 'postgresql',
});
```

| Do | Do Not |
|-----|--------|
| Use semantic conventions when available | Invent names for standard concepts |
| Keep attribute values low cardinality | Use user IDs as attribute values |
| Add attributes that help debugging | Add every variable as an attribute |
| Redact sensitive data | Include passwords or PII |

---

## Recording Events

Events are timestamped annotations within a span, marking significant moments.

```typescript
async function processPayment(order: Order): Promise<PaymentResult> {
  return tracer.startActiveSpan('process-payment', async (span) => {
    span.addEvent('validation.started');
    const result = await validatePaymentDetails(order.payment);

    if (!result.valid) {
      span.addEvent('validation.failed', {
        'validation.error_code': result.errorCode,
      });
      throw new PaymentValidationError(result.errorCode);
    }

    span.addEvent('gateway.request.started', { 'gateway.name': 'stripe' });
    const payment = await paymentGateway.charge(order);
    span.addEvent('gateway.request.completed', {
      'gateway.transaction_id': payment.transactionId,
    });

    span.end();
    return payment;
  });
}
```

| Scenario | Use Event | Use Child Span |
|----------|-----------|----------------|
| Marking a point in time | Yes | No |
| Operation with duration to measure | No | Yes |
| Retry attempt marker | Yes | No |
| Database query | No | Yes |
| Cache hit/miss | Yes | No |

---

## Setting Span Status and Recording Errors

Span status indicates whether the operation succeeded or failed.

```typescript
import { SpanStatusCode } from '@opentelemetry/api';

async function chargePayment(order: Order): Promise<void> {
  return tracer.startActiveSpan('charge-payment', async (span) => {
    span.setAttributes({
      'payment.amount': order.total,
      'payment.currency': order.currency,
    });

    try {
      await paymentGateway.charge(order);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      // Record exception with full details
      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Payment failed',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

| Status Code | When to Use |
|-------------|-------------|
| `UNSET` | Default, outcome unknown |
| `OK` | Operation completed successfully |
| `ERROR` | Operation failed |

---

## Context Propagation

Context propagation ensures spans are correctly linked across async boundaries and service calls.

### Preserving Context in Async Code

```typescript
import { context, trace } from '@opentelemetry/api';

async function processOrderAsync(order: Order): Promise<void> {
  return tracer.startActiveSpan('process-order', async (parentSpan) => {
    const currentContext = context.active();

    // Preserve context in callback
    setTimeout(() => {
      context.with(currentContext, () => {
        const childSpan = tracer.startSpan('delayed-notification');
        sendNotification(order);
        childSpan.end();
      });
    }, 5000);

    parentSpan.end();
  });
}
```

### Propagating Context Across HTTP Calls

```typescript
import { context, propagation, SpanKind, SpanStatusCode } from '@opentelemetry/api';

async function callInventoryService(items: OrderItem[]): Promise<InventoryResult> {
  return tracer.startActiveSpan(
    'inventory-service.reserve',
    { kind: SpanKind.CLIENT },
    async (span) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Inject W3C traceparent header
      propagation.inject(context.active(), headers);

      try {
        const response = await fetch('https://inventory.internal/reserve', {
          method: 'POST',
          headers,
          body: JSON.stringify({ items }),
        });

        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: SpanStatusCode.OK });
        return await response.json();
      } catch (error) {
        if (error instanceof Error) span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
```

### Extracting Context from Incoming Requests

```typescript
import { context, propagation } from '@opentelemetry/api';
import express from 'express';

const app = express();

app.post('/reserve', (req, res) => {
  const extractedContext = propagation.extract(context.active(), req.headers);

  context.with(extractedContext, () => {
    const span = tracer.startSpan('handle-reserve-request');
    // This span is now part of the distributed trace
    span.end();
    res.json({ success: true });
  });
});
```

---

## Nested Spans

Proper span nesting creates clear trace hierarchies.

```typescript
async function fulfillOrder(orderId: string): Promise<void> {
  return tracer.startActiveSpan('fulfill-order', async (parentSpan) => {
    parentSpan.setAttribute('order.id', orderId);

    // Child: fetch order
    const order = await tracer.startActiveSpan('fetch-order', async (span) => {
      const result = await db.orders.findById(orderId);
      span.end();
      return result;
    });

    // Child: process shipping
    await tracer.startActiveSpan('process-shipping', async (span) => {
      const shipment = await shippingService.createShipment(order);
      span.setAttribute('shipment.tracking_number', shipment.trackingNumber);
      span.end();
    });

    parentSpan.end();
  });
}
```

Access the active span without creating a new one.

```typescript
import { trace } from '@opentelemetry/api';

function addOrderAttributes(order: Order): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes({
      'order.id': order.id,
      'order.total': order.total,
    });
  }
}
```

---

## Custom Metrics

Metrics complement traces with aggregated measurements.

### Counter Metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('order-service');

const ordersCounter = meter.createCounter('orders_created_total', {
  description: 'Total number of orders created',
});

async function createOrder(orderData: OrderInput): Promise<Order> {
  const order = await db.orders.create(orderData);

  ordersCounter.add(1, {
    'order.type': order.type,
    'customer.tier': order.customerTier,
  });

  return order;
}
```

### Histogram Metrics

```typescript
const processingDuration = meter.createHistogram('order_processing_duration_ms', {
  description: 'Time to process an order in milliseconds',
  unit: 'ms',
});

async function processOrder(order: Order): Promise<void> {
  const startTime = Date.now();
  try {
    await fulfillOrder(order);
  } finally {
    processingDuration.record(Date.now() - startTime, {
      'order.type': order.type,
    });
  }
}
```

### UpDownCounter Metrics

```typescript
const activeOrdersGauge = meter.createUpDownCounter('orders_active', {
  description: 'Orders currently being processed',
});

async function processOrder(order: Order): Promise<void> {
  activeOrdersGauge.add(1);
  try {
    await fulfillOrder(order);
  } finally {
    activeOrdersGauge.add(-1);
  }
}
```

---

## Common Mistakes to Avoid

### Forgetting to End Spans

```typescript
// Wrong: span never ends
async function badExample(): Promise<void> {
  const span = tracer.startSpan('operation');
  await doWork();
  // Missing: span.end()
}

// Correct: always end in finally
async function goodExample(): Promise<void> {
  const span = tracer.startSpan('operation');
  try {
    await doWork();
  } finally {
    span.end();
  }
}
```

### Creating Too Many Spans

```typescript
// Wrong: span per item
async function badExample(items: Item[]): Promise<void> {
  for (const item of items) {
    const span = tracer.startSpan('process-item');
    await processItem(item);
    span.end();
  }
}

// Correct: one span, events for items
async function goodExample(items: Item[]): Promise<void> {
  return tracer.startActiveSpan('process-items-batch', async (span) => {
    span.setAttribute('batch.size', items.length);
    for (const item of items) {
      span.addEvent('processing-item', { 'item.id': item.id });
      await processItem(item);
    }
    span.end();
  });
}
```

### Losing Context in Callbacks

```typescript
// Wrong: context lost
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    const child = tracer.startSpan('child'); // No parent
    child.end();
  }, 100);
  span.end();
});

// Correct: preserve context
tracer.startActiveSpan('parent', (span) => {
  const ctx = context.active();
  setTimeout(() => {
    context.with(ctx, () => {
      const child = tracer.startSpan('child'); // Has parent
      child.end();
    });
  }, 100);
  span.end();
});
```

---

## Summary

| Topic | Key Points |
|-------|------------|
| **Tracer** | Create one per module, use consistent naming |
| **Spans** | Represent units of work, always end them |
| **Attributes** | Add context, keep cardinality low |
| **Events** | Mark points in time within spans |
| **Status** | Set OK or ERROR, record exceptions |
| **Context** | Propagate across async boundaries and services |
| **Metrics** | Counters, histograms, gauges for aggregated data |

Manual instrumentation gives you precise control over what you trace and measure. Start with key business operations and iterate based on what helps you debug your system.

---

**Related Reading:**

- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
