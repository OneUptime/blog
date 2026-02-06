# How to Set Up OpenTelemetry for a Simple Monolith Before Moving to Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Monolith, Microservices, Migration, Instrumentation

Description: A practical guide to instrumenting a monolithic application with OpenTelemetry to prepare for eventual microservices migration, with patterns that work in both architectures.

Most teams start with a monolith and later split into microservices. If you instrument the monolith correctly with OpenTelemetry from the beginning, the microservices migration becomes much easier. You'll already have observability in place, understand your boundaries, and won't need to rewrite instrumentation.

This guide shows how to add OpenTelemetry to a monolith in a way that naturally supports the future microservices split.

## Why Instrument the Monolith First

Teams often think: "We're just a monolith, we don't need distributed tracing yet." Wrong. Instrumenting the monolith early gives you:

**Baseline visibility**: Understand current performance before you split services. After migration, you can compare.

**Boundary identification**: Traces reveal which parts of the codebase interact frequently. These boundaries inform how to split the monolith.

**Zero rewrite**: When you extract a service, the instrumentation moves with the code. You don't start over.

**Practice**: Learn OpenTelemetry patterns in a simple environment before dealing with distributed complexity.

**Immediate value**: Even monoliths benefit from tracing. See which database queries are slow, which code paths are hot, where errors occur.

## The Monolith Architecture We'll Instrument

Consider a typical monolith: an Express.js application with multiple modules handling different domains.

```
monolith-app/
  src/
    auth/
      login.js
      register.js
      middleware.js
    users/
      service.js
      repository.js
    orders/
      service.js
      repository.js
      fulfillment.js
    payments/
      service.js
      gateway.js
    notifications/
      email.js
      sms.js
    shared/
      database.js
      cache.js
  app.js
```

Each module represents a potential future microservice. The boundaries exist in code organization but not yet in deployment.

## Step 1: Add OpenTelemetry Foundation

Start with basic OpenTelemetry setup that works for both monolith and microservices.

Install dependencies:

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/api \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/sdk-metrics
```

Create `tracing.js`:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Use environment variables for configuration
const serviceName = process.env.OTEL_SERVICE_NAME || 'monolith-app';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const environment = process.env.ENVIRONMENT || 'development';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000, // Export metrics every minute
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log(`OpenTelemetry initialized for ${serviceName}`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

Load this before your application code in `app.js`:

```javascript
require('./tracing');

const express = require('express');
const app = express();

// Your application code
```

Auto-instrumentation now captures HTTP requests, database calls, and other operations without manual work.

## Step 2: Instrument Module Boundaries

Even though everything runs in one process, treat each module as if it's a separate service. This makes the eventual split seamless.

Create a tracer for each module:

```javascript
// src/orders/service.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('orders-module', '1.0.0');

async function createOrder(userId, items) {
  const span = tracer.startSpan('orders.create', {
    attributes: {
      'user.id': userId,
      'order.item_count': items.length,
    }
  });

  try {
    const order = await saveOrder(userId, items);
    span.setAttribute('order.id', order.id);
    span.end();
    return order;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    span.end();
    throw error;
  }
}
```

```javascript
// src/payments/service.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('payments-module', '1.0.0');

async function processPayment(orderId, amount) {
  const span = tracer.startSpan('payments.process', {
    attributes: {
      'order.id': orderId,
      'payment.amount': amount,
    }
  });

  try {
    const result = await chargeCard(amount);
    span.setAttribute('payment.transaction_id', result.id);
    span.end();
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    span.end();
    throw error;
  }
}
```

Notice each module has its own tracer with a distinct name. When you extract `payments` into a microservice, change the `service.name` resource attribute but keep the tracer name. This maintains continuity in your telemetry.

## Step 3: Model Service Boundaries in Code

Structure your code to reflect future service boundaries. Each module should have clear interfaces.

```javascript
// src/orders/index.js - Public interface for orders module
const service = require('./service');
const repository = require('./repository');

module.exports = {
  createOrder: service.createOrder,
  getOrder: service.getOrder,
  listOrders: service.listOrders,
  cancelOrder: service.cancelOrder,
};
```

Other modules import from the index, not internal files:

```javascript
// Good: using the public interface
const orders = require('./orders');
const newOrder = await orders.createOrder(userId, items);

// Bad: reaching into internals
const orderService = require('./orders/service');
const newOrder = await orderService.createOrder(userId, items);
```

This discipline makes extraction easier. When orders becomes a service, you replace the local import with an HTTP client that has the same interface.

## Step 4: Instrument Cross-Module Calls

When one module calls another, create spans to show the boundary crossing. This reveals dependencies.

```javascript
// src/orders/service.js
const { trace, context } = require('@opentelemetry/api');
const payments = require('../payments');
const notifications = require('../notifications');

const tracer = trace.getTracer('orders-module', '1.0.0');

async function createOrder(userId, items) {
  const span = tracer.startSpan('orders.create');

  try {
    // Save order first
    const order = await saveOrder(userId, items);

    // Process payment (cross-module call)
    const paymentSpan = tracer.startSpan('orders.call.payments', {
      attributes: {
        'target.module': 'payments',
        'operation': 'processPayment',
      }
    });

    let payment;
    try {
      payment = await payments.processPayment(order.id, order.total);
      paymentSpan.end();
    } catch (error) {
      paymentSpan.recordException(error);
      paymentSpan.end();
      throw error;
    }

    // Send notification (cross-module call)
    const notifySpan = tracer.startSpan('orders.call.notifications', {
      attributes: {
        'target.module': 'notifications',
        'operation': 'sendOrderConfirmation',
      }
    });

    try {
      await notifications.sendOrderConfirmation(userId, order.id);
      notifySpan.end();
    } catch (error) {
      // Log but don't fail order creation if notification fails
      notifySpan.recordException(error);
      notifySpan.end();
    }

    span.end();
    return order;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2 });
    span.end();
    throw error;
  }
}
```

These spans show module interactions in traces. After splitting into microservices, these same boundaries become service-to-service HTTP calls, automatically instrumented by OpenTelemetry.

## Step 5: Add Custom Metrics per Module

Each module should track its own metrics. These become service-level metrics after the split.

```javascript
// src/orders/metrics.js
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('orders-module', '1.0.0');

const ordersCreated = meter.createCounter('orders.created', {
  description: 'Total orders created',
});

const orderValue = meter.createHistogram('orders.value', {
  description: 'Order value distribution',
  unit: 'USD',
});

const orderProcessingDuration = meter.createHistogram('orders.processing.duration', {
  description: 'Order processing duration',
  unit: 'ms',
});

module.exports = {
  ordersCreated,
  orderValue,
  orderProcessingDuration,
};
```

Use these metrics in the module:

```javascript
// src/orders/service.js
const metrics = require('./metrics');

async function createOrder(userId, items) {
  const start = Date.now();

  try {
    const order = await saveOrder(userId, items);

    // Record metrics
    metrics.ordersCreated.add(1, {
      'user.tier': getUserTier(userId),
      'order.type': order.type,
    });

    metrics.orderValue.record(order.total, {
      'order.type': order.type,
    });

    const duration = Date.now() - start;
    metrics.orderProcessingDuration.record(duration);

    return order;
  } catch (error) {
    metrics.ordersCreated.add(1, {
      'status': 'failed',
      'error.type': error.name,
    });
    throw error;
  }
}
```

After splitting, each service tracks its own metrics with no changes to the instrumentation code.

## Step 6: Use Structured Logging with Context

Logs should include trace context and module information.

```javascript
// src/shared/logger.js
const pino = require('pino');
const { trace, context } = require('@opentelemetry/api');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

function createLogger(moduleName) {
  return {
    info: (message, extra = {}) => log('info', moduleName, message, extra),
    warn: (message, extra = {}) => log('warn', moduleName, message, extra),
    error: (message, extra = {}) => log('error', moduleName, message, extra),
    debug: (message, extra = {}) => log('debug', moduleName, message, extra),
  };
}

function log(level, moduleName, message, extra) {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();

  logger[level]({
    message,
    module: moduleName,
    trace_id: spanContext?.traceId,
    span_id: spanContext?.spanId,
    service: process.env.OTEL_SERVICE_NAME || 'monolith-app',
    ...extra,
  });
}

module.exports = { createLogger };
```

Use module-specific loggers:

```javascript
// src/orders/service.js
const { createLogger } = require('../shared/logger');
const logger = createLogger('orders');

async function createOrder(userId, items) {
  logger.info('Creating order', { user_id: userId, item_count: items.length });

  try {
    const order = await saveOrder(userId, items);
    logger.info('Order created', { order_id: order.id, total: order.total });
    return order;
  } catch (error) {
    logger.error('Order creation failed', {
      user_id: userId,
      error: error.message,
    });
    throw error;
  }
}
```

After splitting, change the `service` field from `monolith-app` to the specific service name (like `orders-service`). Everything else stays the same.

## Step 7: Identify Split Points from Traces

Run the instrumented monolith for a few weeks. Then analyze traces to understand coupling.

**Look for these patterns:**

**Frequent cross-module calls**: If orders calls payments on every request, they're tightly coupled. Consider keeping them together initially.

**Long sequential chains**: If order creation calls payments, then inventory, then fulfillment in sequence, splitting increases latency. Consider extracting less coupled modules first.

**Independent modules**: If notifications is only called from other modules and doesn't call back, it's a good candidate for early extraction.

**Shared data access**: If multiple modules directly query the same database tables, you have data coupling. Refactor before splitting.

Query your tracing backend:

```
Show me all spans where:
  - Tracer name is "orders-module"
  - Span contains calls to other modules

Group by: target module
Order by: call frequency
```

This reveals which modules orders depends on most heavily.

## Step 8: Prepare for the First Service Split

When you're ready to extract a service, OpenTelemetry makes the transition smooth.

### Before: Module in Monolith

```javascript
// Monolith: src/orders/index.js
const service = require('./service');

module.exports = {
  createOrder: service.createOrder,
  getOrder: service.getOrder,
};
```

```javascript
// Monolith: src/payments/service.js
const orders = require('../orders');

async function handlePaymentSuccess(paymentId) {
  const order = await orders.getOrder(orderId);
  // ...
}
```

### After: Extracted Service

Orders service (new microservice):

```javascript
// orders-service/src/tracing.js
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'orders-service', // Changed!
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
});

// Rest of tracing setup stays identical
```

```javascript
// orders-service/src/service.js
// No changes needed - same instrumentation works
const tracer = trace.getTracer('orders-module', '1.0.0');

async function createOrder(userId, items) {
  const span = tracer.startSpan('orders.create');
  // Same code as before
}
```

Monolith now calls orders service via HTTP:

```javascript
// Monolith: src/orders/client.js
const axios = require('axios');

const ordersBaseUrl = process.env.ORDERS_SERVICE_URL || 'http://orders-service:3000';

async function createOrder(userId, items) {
  // Auto-instrumentation adds trace context to outgoing request
  const response = await axios.post(`${ordersBaseUrl}/orders`, {
    userId,
    items,
  });

  return response.data;
}

async function getOrder(orderId) {
  const response = await axios.get(`${ordersBaseUrl}/orders/${orderId}`);
  return response.data;
}

module.exports = {
  createOrder,
  getOrder,
};
```

OpenTelemetry auto-instrumentation:
- Adds a client span for the HTTP call in the monolith
- Injects trace context into HTTP headers
- Extracts trace context in the orders service
- Creates a server span in the orders service
- Links everything into one distributed trace

You see the full trace spanning both services with no manual context propagation.

## Step 9: Handle Shared Resources

Monoliths often have shared resources (database connections, caches). Instrument these carefully.

```javascript
// src/shared/database.js
const { trace } = require('@opentelemetry/api');
const pg = require('pg');

const tracer = trace.getTracer('database-shared', '1.0.0');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Wrapper that adds tracing
async function query(text, params, context) {
  const span = tracer.startSpan('db.query', {
    attributes: {
      'db.system': 'postgresql',
      'db.statement': text,
      'db.operation': text.split(' ')[0].toUpperCase(),
    }
  });

  try {
    const result = await pool.query(text, params);
    span.setAttribute('db.rows_affected', result.rowCount);
    span.end();
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2 });
    span.end();
    throw error;
  }
}

module.exports = { query };
```

After splitting services, each service gets its own database connection (or better, its own database). The instrumentation stays the same, but now you see which service is making which queries.

## Step 10: Monitor the Migration

As you extract services, compare metrics and traces before and after.

**Latency**: Does the extracted service add network overhead? Compare:
- Before: `orders.create` span duration
- After: Total trace duration including HTTP call

**Error rates**: Did extraction introduce new failure modes?
- Monitor: `orders.created` metric with `status=failed` attribute

**Dependencies**: Are new services calling back to the monolith more than expected?
- Query traces for: server spans in monolith from extracted services

**Resource usage**: Are you creating duplicate work?
- Check: duplicate database queries from both monolith and new service

## Common Patterns That Migrate Cleanly

### Pattern: Domain Events

Use domain events to decouple modules. This pattern works in both monolith and microservices.

Monolith version:

```javascript
// src/shared/events.js
const EventEmitter = require('events');
const emitter = new EventEmitter();

const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('events', '1.0.0');

function emit(eventName, data) {
  const span = tracer.startSpan('event.emit', {
    attributes: {
      'event.name': eventName,
    }
  });

  emitter.emit(eventName, data);
  span.end();
}

function on(eventName, handler) {
  emitter.on(eventName, async (data) => {
    const span = tracer.startSpan('event.handle', {
      attributes: {
        'event.name': eventName,
      }
    });

    try {
      await handler(data);
      span.end();
    } catch (error) {
      span.recordException(error);
      span.end();
    }
  });
}

module.exports = { emit, on };
```

Usage:

```javascript
// src/orders/service.js
const events = require('../shared/events');

async function createOrder(userId, items) {
  const order = await saveOrder(userId, items);

  // Emit event instead of directly calling other modules
  events.emit('order.created', {
    orderId: order.id,
    userId: userId,
    total: order.total,
  });

  return order;
}

// src/notifications/service.js
const events = require('../shared/events');

events.on('order.created', async (data) => {
  await sendOrderConfirmation(data.userId, data.orderId);
});
```

After splitting into microservices, replace the in-process EventEmitter with a message queue (RabbitMQ, Kafka, etc.). The emit/on pattern stays the same. OpenTelemetry auto-instruments message queues, maintaining trace continuity.

### Pattern: Request Context

Pass context explicitly instead of using globals. This makes dependencies visible and testable.

```javascript
// src/shared/context.js
class RequestContext {
  constructor(userId, requestId, authToken) {
    this.userId = userId;
    this.requestId = requestId;
    this.authToken = authToken;
  }
}

module.exports = { RequestContext };
```

```javascript
// src/orders/service.js
async function createOrder(context, items) {
  const span = tracer.startSpan('orders.create', {
    attributes: {
      'user.id': context.userId,
      'request.id': context.requestId,
    }
  });

  // Use context.userId instead of global auth state
  const order = await saveOrder(context.userId, items);

  span.end();
  return order;
}
```

After splitting, the context becomes HTTP headers (user ID, auth token) that flow between services. OpenTelemetry propagates trace context automatically alongside your custom headers.

## Mistakes to Avoid

**Mistake: Not instrumenting internal boundaries**

If you only instrument HTTP endpoints, you lose visibility when you split. Instrument module boundaries from the start.

**Mistake: Using unbounded attributes**

Avoid: `span.setAttribute('user.id', userId)` if you have millions of users.

Use: `span.setAttribute('user.tier', 'enterprise')` with bounded values.

**Mistake: Tight coupling through shared state**

If modules share mutable state (global variables, singleton caches), extraction will be painful. Use dependency injection and explicit interfaces.

**Mistake: Ignoring data boundaries**

If multiple modules directly query the same database tables, you have data coupling. Refactor to use interfaces before splitting.

**Mistake: Splitting without observability**

Don't extract a service until you have instrumentation showing its interactions. You need baseline metrics to understand the impact of splitting.

## The Migration Path

1. **Instrument the monolith** with OpenTelemetry (you are here)
2. **Run for weeks**, collect traces and metrics
3. **Analyze dependencies** from traces to identify coupling
4. **Refactor boundaries** to reduce coupling between modules
5. **Extract the first service** (start with low-coupling modules like notifications)
6. **Monitor and compare** metrics before/after
7. **Extract more services** incrementally
8. **Each service keeps the same instrumentation**, only changing service name

The instrumentation doesn't need rewriting. It moves with the code from monolith to microservice.

## Key Takeaways

Instrument your monolith as if it's already distributed. Use distinct tracers per module, track module boundaries, emit module-specific metrics.

This preparation makes microservices extraction smooth. The telemetry moves with the code. You maintain visibility throughout the migration.

You also get immediate value: understand your monolith's performance, identify bottlenecks, and debug production issues with traces.

OpenTelemetry's vendor-neutral approach means you can change observability backends without touching instrumentation code. Focus on building features, not managing vendor-specific agents.

## Related Reading

- [How to Understand OpenTelemetry Architecture: API, SDK, and Collector Explained Simply](https://oneuptime.com/blog/post/2026-02-06-opentelemetry-architecture-api-sdk-collector/view)
- [How to Set Up Your First OpenTelemetry Pipeline in 10 Minutes](https://oneuptime.com/blog/post/2026-02-06-first-opentelemetry-pipeline-10-minutes/view)
- [What is OpenTelemetry Collector and Why Use One?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
