# How to Instrument Express.js Applications with OpenTelemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, OpenTelemetry, Observability, Tracing, Monitoring, DevOps

Description: Learn to instrument Express.js applications with OpenTelemetry for distributed tracing, including middleware instrumentation, route tracing, and error correlation.

---

Observability in Express.js applications requires understanding how requests flow through your middleware, routes, and external services. OpenTelemetry provides the standard way to capture traces, metrics, and logs that give you this visibility.

For more on OpenTelemetry fundamentals, see our guides on [traces and spans](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) and [structured logging](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view).

## Setting Up OpenTelemetry

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/semantic-conventions
```

### Basic Setup

Create `tracing.js` - this must be loaded before any other modules so instrumentation can wrap HTTP and database libraries before they're imported.

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Define service identity - this appears in all traces/metrics
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'express-api',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure where to send traces (Jaeger, Zipkin, or any OTLP-compatible backend)
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

// Configure where to send metrics
const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

// Initialize the SDK with all configuration
const sdk = new NodeSDK({
  resource,
  traceExporter,
  // Export metrics every 30 seconds
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  }),
  // Auto-instrument common libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },  // Express routes
      '@opentelemetry/instrumentation-http': { enabled: true },     // HTTP client/server
      '@opentelemetry/instrumentation-pg': { enabled: true },       // PostgreSQL
      '@opentelemetry/instrumentation-redis': { enabled: true },    // Redis
    }),
  ],
});

// Start the SDK - must happen before importing other modules
sdk.start();

// Ensure spans are flushed before process exits
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

### Loading Order

The tracing module must be imported first, before Express or any other libraries. This ensures the instrumentation can monkey-patch modules before they are used.

```javascript
// app.js - Load tracing FIRST before any other imports
require('./tracing');

// Now import Express and other modules - they will be instrumented
const express = require('express');
const app = express();

// ... rest of your app
```

Alternatively, use Node's `-r` flag to preload the tracing module:

```bash
# This loads tracing.js before app.js runs
node -r ./tracing.js app.js
```

## Custom Span Creation

While auto-instrumentation captures Express routes and HTTP calls, you often need custom spans for business logic. Custom spans let you measure specific operations and add domain-specific attributes.

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('express-api');

app.post('/orders', async (req, res) => {
  // Create a custom span for order processing
  const span = tracer.startSpan('process-order', {
    attributes: {
      'order.customer_id': req.body.customerId,
      'order.items_count': req.body.items?.length || 0,
    },
  });

  try {
    // Child span for validation
    const validationSpan = tracer.startSpan('validate-order', {
      parent: trace.setSpan(trace.active(), span),
    });

    const validationResult = await validateOrder(req.body);
    validationSpan.setStatus({ code: SpanStatusCode.OK });
    validationSpan.end();

    if (!validationResult.valid) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Validation failed',
      });
      return res.status(400).json({ errors: validationResult.errors });
    }

    // Child span for payment
    const paymentSpan = tracer.startSpan('process-payment');
    try {
      await processPayment(req.body.payment);
      paymentSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      paymentSpan.recordException(error);
      paymentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      paymentSpan.end();
    }

    // Create order
    const order = await createOrder(req.body);

    span.setAttribute('order.id', order.id);
    span.setStatus({ code: SpanStatusCode.OK });

    res.status(201).json(order);
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    res.status(500).json({ error: 'Order processing failed' });
  } finally {
    span.end();
  }
});
```

### Using Context for Span Nesting

```javascript
const { trace, context } = require('@opentelemetry/api');

async function processOrderWithContext(orderData) {
  const tracer = trace.getTracer('order-service');

  return tracer.startActiveSpan('process-order', async (parentSpan) => {
    try {
      // This span is automatically a child of 'process-order'
      const order = await tracer.startActiveSpan('create-order', async (span) => {
        const result = await db.orders.create(orderData);
        span.setAttribute('order.id', result.id);
        span.end();
        return result;
      });

      // Send notification in background
      await tracer.startActiveSpan('send-notification', async (span) => {
        await notificationService.send(order);
        span.end();
      });

      parentSpan.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (error) {
      parentSpan.recordException(error);
      parentSpan.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      parentSpan.end();
    }
  });
}
```

## Custom Middleware for Request Tracing

Add request-level attributes and timing:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

function requestTracingMiddleware(req, res, next) {
  const span = trace.getActiveSpan();

  if (span) {
    // Add request attributes
    span.setAttributes({
      'http.request_id': req.headers['x-request-id'] || crypto.randomUUID(),
      'http.user_agent': req.headers['user-agent'],
      'http.client_ip': req.ip,
    });

    // Add user info if authenticated
    if (req.user) {
      span.setAttributes({
        'enduser.id': req.user.id,
        'enduser.role': req.user.role,
      });
    }

    // Track response
    const originalEnd = res.end;
    res.end = function(...args) {
      span.setAttribute('http.response_content_length', res.get('Content-Length') || 0);

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      }

      return originalEnd.apply(this, args);
    };
  }

  next();
}

app.use(requestTracingMiddleware);
```

## Error Correlation

Correlate errors with traces for debugging:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();

  if (span) {
    // Record exception with full details
    span.recordException(err);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });

    // Add error attributes
    span.setAttributes({
      'error.type': err.name,
      'error.message': err.message,
      'error.stack': err.stack,
    });

    // Get trace context for logging
    const spanContext = span.spanContext();
    console.error({
      message: err.message,
      stack: err.stack,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    });
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      traceId: span?.spanContext().traceId,
    },
  });
});
```

## Database Query Tracing

While auto-instrumentation handles basic query tracing, add business context:

```javascript
const { trace } = require('@opentelemetry/api');

class TracedRepository {
  constructor(model, tracer) {
    this.model = model;
    this.tracer = tracer || trace.getTracer('database');
  }

  async findById(id, options = {}) {
    return this.tracer.startActiveSpan(`${this.model.name}.findById`, {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': 'SELECT',
        'db.table': this.model.tableName,
        'db.query.id': id,
      },
    }, async (span) => {
      try {
        const result = await this.model.findByPk(id, options);
        span.setAttribute('db.rows_affected', result ? 1 : 0);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findMany(where, options = {}) {
    return this.tracer.startActiveSpan(`${this.model.name}.findMany`, {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': 'SELECT',
        'db.table': this.model.tableName,
      },
    }, async (span) => {
      try {
        const results = await this.model.findAll({ where, ...options });
        span.setAttribute('db.rows_affected', results.length);
        span.setStatus({ code: SpanStatusCode.OK });
        return results;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

## External Service Call Tracing

Trace calls to external APIs with full context:

```javascript
const { trace, SpanStatusCode, propagation, context } = require('@opentelemetry/api');

class TracedHttpClient {
  constructor() {
    this.tracer = trace.getTracer('http-client');
  }

  async request(config) {
    const span = this.tracer.startSpan(`HTTP ${config.method} ${new URL(config.url).hostname}`, {
      attributes: {
        'http.method': config.method,
        'http.url': config.url,
        'http.target': new URL(config.url).pathname,
        'net.peer.name': new URL(config.url).hostname,
      },
    });

    // Inject trace context into headers
    const headers = { ...config.headers };
    propagation.inject(context.active(), headers);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      span.setAttributes({
        'http.status_code': response.status,
        'http.response_content_length': response.headers.get('content-length'),
      });

      if (!response.ok) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      return response;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }
}

// Usage
const httpClient = new TracedHttpClient();

app.get('/users/:id/orders', async (req, res) => {
  const orders = await httpClient.request({
    method: 'GET',
    url: `${ORDER_SERVICE_URL}/orders?userId=${req.params.id}`,
    headers: { 'Authorization': req.headers.authorization },
  });

  res.json(await orders.json());
});
```

## Custom Metrics

Add business metrics alongside traces:

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('express-api');

// Create metrics
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

const requestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

const activeConnections = meter.createUpDownCounter('http_active_connections', {
  description: 'Number of active HTTP connections',
});

// Metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  activeConnections.add(1);

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const labels = {
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode.toString(),
    };

    requestCounter.add(1, labels);
    requestDuration.record(duration, labels);
    activeConnections.add(-1);
  });

  next();
});

// Business metrics
const ordersCreated = meter.createCounter('orders_created_total', {
  description: 'Total orders created',
});

const orderValue = meter.createHistogram('order_value_usd', {
  description: 'Order value in USD',
  unit: 'usd',
});

app.post('/orders', async (req, res) => {
  // ... create order

  ordersCreated.add(1, { customer_type: req.user.type });
  orderValue.record(order.total, { currency: 'USD' });

  res.json(order);
});
```

## Structured Logging with Trace Context

Correlate logs with traces:

```javascript
const { trace } = require('@opentelemetry/api');
const winston = require('winston');

// Custom format to include trace context
const traceFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    info.traceId = ctx.traceId;
    info.spanId = ctx.spanId;
  }
  return info;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    traceFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Usage in routes
app.get('/users/:id', async (req, res) => {
  logger.info('Fetching user', { userId: req.params.id });

  const user = await getUser(req.params.id);

  if (!user) {
    logger.warn('User not found', { userId: req.params.id });
    return res.status(404).json({ error: 'User not found' });
  }

  logger.info('User fetched successfully', { userId: user.id });
  res.json(user);
});
```

## Production Configuration

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ParentBasedSampler, TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  headers: {
    'Authorization': `Bearer ${process.env.OTEL_AUTH_TOKEN}`,
  },
});

const sdk = new NodeSDK({
  // Batch spans for efficiency
  spanProcessor: new BatchSpanProcessor(exporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  }),

  // Sample in production (10% of traces)
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(
      parseFloat(process.env.OTEL_SAMPLE_RATE) || 0.1
    ),
  }),

  // ... rest of config
});
```

## Summary

| Component | Implementation |
|-----------|----------------|
| **Auto-instrumentation** | Express, HTTP, database libraries |
| **Custom spans** | Business logic, external calls |
| **Error handling** | recordException, error attributes |
| **Metrics** | Counters, histograms for business KPIs |
| **Logging** | Trace context injection |
| **Production** | Batch processing, sampling |

OpenTelemetry instrumentation gives you complete visibility into your Express.js application's behavior, from HTTP requests through database queries to external service calls. This observability is essential for debugging, performance optimization, and understanding user journeys in distributed systems.
