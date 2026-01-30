# How to Build Request Tracing in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Observability, Tracing, OpenTelemetry

Description: Implement distributed request tracing in Node.js using AsyncLocalStorage and OpenTelemetry for end-to-end visibility across microservices.

---

When a request flows through multiple services, tracking its journey becomes difficult. A user clicks a button, and suddenly five different services handle pieces of that request. When something breaks, you need to know exactly where and why. Request tracing solves this problem by assigning a unique identifier to each request and carrying that identifier through every service the request touches.

This guide walks through building request tracing in Node.js from scratch, then integrating with OpenTelemetry for production-grade distributed tracing.

## What Request Tracing Solves

Consider a typical microservices flow:

```
User Request → API Gateway → User Service → Order Service → Payment Service → Database
```

Without tracing, your logs look like this:

```
[User Service] Processing user lookup
[Order Service] Fetching order data
[Payment Service] Error: timeout
[User Service] Completed request
```

You cannot tell which logs belong to which request. With tracing, every log includes a trace ID:

```
[trace-id: abc123] [User Service] Processing user lookup
[trace-id: abc123] [Order Service] Fetching order data
[trace-id: abc123] [Payment Service] Error: timeout
[trace-id: abc123] [User Service] Completed request
```

Now you can filter by `abc123` and see the complete request journey.

## Part 1: Request ID Generation

Every trace starts with a unique identifier. The ID must be unique across all services and all time. UUIDs work well for this purpose.

### Basic UUID Generation

The `crypto` module provides a built-in way to generate UUIDs in Node.js:

```javascript
// src/tracing/id-generator.js
const crypto = require('crypto');

function generateTraceId() {
    // Generate a UUID v4 - this provides sufficient uniqueness
    // for distributed systems handling millions of requests
    return crypto.randomUUID();
}

function generateSpanId() {
    // Span IDs are shorter - 16 hex characters
    // Each span represents a single operation within a trace
    return crypto.randomBytes(8).toString('hex');
}

module.exports = {
    generateTraceId,
    generateSpanId
};
```

### Custom ID Format for Readability

Some teams prefer IDs that include timestamp information for easier debugging:

```javascript
// src/tracing/readable-id-generator.js
const crypto = require('crypto');

function generateReadableTraceId() {
    // Format: timestamp-randomhex
    // Example: 1706634000000-a1b2c3d4e5f6
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    return `${timestamp}-${random}`;
}

function parseTraceId(traceId) {
    // Extract timestamp from trace ID for debugging
    const [timestampStr, random] = traceId.split('-');
    const timestamp = parseInt(timestampStr, 10);
    return {
        timestamp,
        date: new Date(timestamp),
        random
    };
}

module.exports = {
    generateReadableTraceId,
    parseTraceId
};
```

### Comparison of ID Strategies

| Strategy | Format | Pros | Cons |
|----------|--------|------|------|
| UUID v4 | `550e8400-e29b-41d4-a716-446655440000` | Standard, widely supported | Long, no timestamp info |
| Timestamp + Random | `1706634000000-a1b2c3d4` | Sortable, debuggable | Custom format, longer |
| Short Random | `a1b2c3d4e5f6` | Compact | Higher collision risk |
| OpenTelemetry | 32 hex chars for trace, 16 for span | Industry standard | Requires library |

## Part 2: AsyncLocalStorage for Request Context

The challenge in Node.js is maintaining context across asynchronous operations. When a request triggers database queries, HTTP calls, and file operations, each runs in a different async context. AsyncLocalStorage solves this by providing a store that persists across async boundaries.

### Setting Up AsyncLocalStorage

```javascript
// src/tracing/context.js
const { AsyncLocalStorage } = require('async_hooks');

// Create a single AsyncLocalStorage instance for the entire application
const asyncLocalStorage = new AsyncLocalStorage();

// Context structure that will be stored
class TraceContext {
    constructor(traceId, spanId, parentSpanId = null) {
        this.traceId = traceId;
        this.spanId = spanId;
        this.parentSpanId = parentSpanId;
        this.startTime = Date.now();
        this.attributes = {};
    }

    setAttribute(key, value) {
        this.attributes[key] = value;
    }

    getAttribute(key) {
        return this.attributes[key];
    }
}

// Run a function within a trace context
function runWithContext(context, fn) {
    return asyncLocalStorage.run(context, fn);
}

// Get the current trace context from anywhere in the call stack
function getCurrentContext() {
    return asyncLocalStorage.getStore();
}

// Get the current trace ID, returns null if no context exists
function getTraceId() {
    const context = getCurrentContext();
    return context ? context.traceId : null;
}

module.exports = {
    TraceContext,
    runWithContext,
    getCurrentContext,
    getTraceId
};
```

### Express Middleware for Automatic Context Creation

This middleware creates a trace context for every incoming request:

```javascript
// src/tracing/middleware.js
const { TraceContext, runWithContext } = require('./context');
const { generateTraceId, generateSpanId } = require('./id-generator');

// Header names for trace propagation
const TRACE_HEADER = 'x-trace-id';
const SPAN_HEADER = 'x-span-id';
const PARENT_SPAN_HEADER = 'x-parent-span-id';

function tracingMiddleware(req, res, next) {
    // Check if trace ID was passed from upstream service
    // If not, generate a new one (this is the entry point)
    const traceId = req.headers[TRACE_HEADER] || generateTraceId();
    const parentSpanId = req.headers[SPAN_HEADER] || null;
    const spanId = generateSpanId();

    // Create context for this request
    const context = new TraceContext(traceId, spanId, parentSpanId);

    // Add useful request attributes
    context.setAttribute('http.method', req.method);
    context.setAttribute('http.url', req.url);
    context.setAttribute('http.user_agent', req.headers['user-agent']);

    // Add trace ID to response headers for debugging
    res.setHeader(TRACE_HEADER, traceId);
    res.setHeader(SPAN_HEADER, spanId);

    // Run the rest of the request handling within this context
    runWithContext(context, () => {
        // Log request start
        console.log(JSON.stringify({
            level: 'info',
            traceId,
            spanId,
            message: 'Request started',
            method: req.method,
            url: req.url
        }));

        // Capture response finish for logging
        res.on('finish', () => {
            const duration = Date.now() - context.startTime;
            console.log(JSON.stringify({
                level: 'info',
                traceId,
                spanId,
                message: 'Request completed',
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                durationMs: duration
            }));
        });

        next();
    });
}

module.exports = {
    tracingMiddleware,
    TRACE_HEADER,
    SPAN_HEADER,
    PARENT_SPAN_HEADER
};
```

### Using the Middleware in Express

```javascript
// src/app.js
const express = require('express');
const { tracingMiddleware } = require('./tracing/middleware');
const { getTraceId, getCurrentContext } = require('./tracing/context');

const app = express();

// Apply tracing middleware to all routes
app.use(tracingMiddleware);

app.get('/api/users/:id', async (req, res) => {
    // getTraceId() works anywhere in the async call stack
    console.log(`Processing request with trace: ${getTraceId()}`);

    const user = await fetchUser(req.params.id);
    res.json(user);
});

async function fetchUser(id) {
    // Even in nested async functions, the trace ID is available
    const traceId = getTraceId();
    console.log(`[${traceId}] Fetching user ${id} from database`);

    // Simulate database call
    return { id, name: 'John Doe' };
}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Part 3: Propagating Trace Context in HTTP Headers

When your service calls another service, you must pass the trace context. This ensures the downstream service continues the same trace.

### HTTP Client Wrapper with Automatic Propagation

```javascript
// src/tracing/http-client.js
const { getCurrentContext, getTraceId } = require('./context');
const { generateSpanId } = require('./id-generator');
const { TRACE_HEADER, SPAN_HEADER, PARENT_SPAN_HEADER } = require('./middleware');

// Wrapper around fetch that automatically propagates trace context
async function tracedFetch(url, options = {}) {
    const context = getCurrentContext();

    if (!context) {
        // No trace context, make regular request
        return fetch(url, options);
    }

    // Create a new span for this outgoing request
    const childSpanId = generateSpanId();

    // Inject trace headers
    const headers = {
        ...options.headers,
        [TRACE_HEADER]: context.traceId,
        [SPAN_HEADER]: childSpanId,
        [PARENT_SPAN_HEADER]: context.spanId
    };

    const startTime = Date.now();

    console.log(JSON.stringify({
        level: 'info',
        traceId: context.traceId,
        spanId: childSpanId,
        parentSpanId: context.spanId,
        message: 'Outgoing HTTP request',
        url,
        method: options.method || 'GET'
    }));

    try {
        const response = await fetch(url, { ...options, headers });
        const duration = Date.now() - startTime;

        console.log(JSON.stringify({
            level: 'info',
            traceId: context.traceId,
            spanId: childSpanId,
            message: 'HTTP request completed',
            url,
            statusCode: response.status,
            durationMs: duration
        }));

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;

        console.log(JSON.stringify({
            level: 'error',
            traceId: context.traceId,
            spanId: childSpanId,
            message: 'HTTP request failed',
            url,
            error: error.message,
            durationMs: duration
        }));

        throw error;
    }
}

module.exports = { tracedFetch };
```

### Axios Interceptor for Trace Propagation

If you use Axios, interceptors provide a clean way to add tracing:

```javascript
// src/tracing/axios-tracing.js
const axios = require('axios');
const { getCurrentContext } = require('./context');
const { generateSpanId } = require('./id-generator');
const { TRACE_HEADER, SPAN_HEADER, PARENT_SPAN_HEADER } = require('./middleware');

function createTracedAxiosInstance() {
    const instance = axios.create();

    // Request interceptor - adds trace headers
    instance.interceptors.request.use((config) => {
        const context = getCurrentContext();

        if (context) {
            const childSpanId = generateSpanId();

            config.headers[TRACE_HEADER] = context.traceId;
            config.headers[SPAN_HEADER] = childSpanId;
            config.headers[PARENT_SPAN_HEADER] = context.spanId;

            // Store span info for response interceptor
            config.metadata = {
                spanId: childSpanId,
                startTime: Date.now()
            };
        }

        return config;
    });

    // Response interceptor - logs completion
    instance.interceptors.response.use(
        (response) => {
            const context = getCurrentContext();
            const metadata = response.config.metadata;

            if (context && metadata) {
                console.log(JSON.stringify({
                    level: 'info',
                    traceId: context.traceId,
                    spanId: metadata.spanId,
                    message: 'HTTP request completed',
                    url: response.config.url,
                    statusCode: response.status,
                    durationMs: Date.now() - metadata.startTime
                }));
            }

            return response;
        },
        (error) => {
            const context = getCurrentContext();
            const metadata = error.config?.metadata;

            if (context && metadata) {
                console.log(JSON.stringify({
                    level: 'error',
                    traceId: context.traceId,
                    spanId: metadata.spanId,
                    message: 'HTTP request failed',
                    url: error.config.url,
                    error: error.message,
                    durationMs: Date.now() - metadata.startTime
                }));
            }

            return Promise.reject(error);
        }
    );

    return instance;
}

module.exports = { createTracedAxiosInstance };
```

## Part 4: Structured Logging with Trace IDs

Logs become useful when they include trace context. Here is a logger that automatically includes trace information.

### Building a Traced Logger

```javascript
// src/tracing/logger.js
const { getCurrentContext, getTraceId } = require('./context');

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

class TracedLogger {
    constructor(options = {}) {
        this.serviceName = options.serviceName || 'unknown-service';
        this.minLevel = LOG_LEVELS[options.level || 'info'];
    }

    _formatMessage(level, message, extra = {}) {
        const context = getCurrentContext();

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            ...extra
        };

        // Add trace context if available
        if (context) {
            logEntry.traceId = context.traceId;
            logEntry.spanId = context.spanId;
            if (context.parentSpanId) {
                logEntry.parentSpanId = context.parentSpanId;
            }
        }

        return JSON.stringify(logEntry);
    }

    _log(level, message, extra) {
        if (LOG_LEVELS[level] >= this.minLevel) {
            console.log(this._formatMessage(level, message, extra));
        }
    }

    debug(message, extra) {
        this._log('debug', message, extra);
    }

    info(message, extra) {
        this._log('info', message, extra);
    }

    warn(message, extra) {
        this._log('warn', message, extra);
    }

    error(message, extra) {
        this._log('error', message, extra);
    }

    // Create a child logger with additional context
    child(extraContext) {
        const childLogger = Object.create(this);
        childLogger._formatMessage = (level, message, extra = {}) => {
            return this._formatMessage(level, message, { ...extraContext, ...extra });
        };
        return childLogger;
    }
}

// Singleton instance for the application
const logger = new TracedLogger({
    serviceName: process.env.SERVICE_NAME || 'my-service',
    level: process.env.LOG_LEVEL || 'info'
});

module.exports = { TracedLogger, logger };
```

### Using the Logger in Application Code

```javascript
// src/services/user-service.js
const { logger } = require('../tracing/logger');
const { tracedFetch } = require('../tracing/http-client');

async function getUserWithOrders(userId) {
    logger.info('Fetching user with orders', { userId });

    try {
        // Fetch user data
        const userResponse = await tracedFetch(`http://user-service/users/${userId}`);
        const user = await userResponse.json();

        logger.debug('User data retrieved', { userId, userName: user.name });

        // Fetch orders for this user
        const ordersResponse = await tracedFetch(`http://order-service/orders?userId=${userId}`);
        const orders = await ordersResponse.json();

        logger.info('Orders retrieved', { userId, orderCount: orders.length });

        return { user, orders };
    } catch (error) {
        logger.error('Failed to fetch user with orders', {
            userId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

module.exports = { getUserWithOrders };
```

### Log Output Example

With this setup, your logs will look like this:

```json
{"timestamp":"2026-01-30T10:15:30.123Z","level":"info","service":"api-gateway","message":"Request started","traceId":"550e8400-e29b-41d4-a716-446655440000","spanId":"a1b2c3d4e5f67890","method":"GET","url":"/api/users/123/orders"}
{"timestamp":"2026-01-30T10:15:30.125Z","level":"info","service":"api-gateway","message":"Fetching user with orders","traceId":"550e8400-e29b-41d4-a716-446655440000","spanId":"a1b2c3d4e5f67890","userId":"123"}
{"timestamp":"2026-01-30T10:15:30.150Z","level":"info","service":"api-gateway","message":"Outgoing HTTP request","traceId":"550e8400-e29b-41d4-a716-446655440000","spanId":"b2c3d4e5f6789012","parentSpanId":"a1b2c3d4e5f67890","url":"http://user-service/users/123"}
{"timestamp":"2026-01-30T10:15:30.200Z","level":"info","service":"api-gateway","message":"HTTP request completed","traceId":"550e8400-e29b-41d4-a716-446655440000","spanId":"b2c3d4e5f6789012","url":"http://user-service/users/123","statusCode":200,"durationMs":50}
```

## Part 5: OpenTelemetry Integration

OpenTelemetry is the industry standard for distributed tracing. It provides automatic instrumentation, vendor-neutral APIs, and integration with observability platforms.

### Installing OpenTelemetry

```bash
npm install @opentelemetry/api \
    @opentelemetry/sdk-node \
    @opentelemetry/auto-instrumentations-node \
    @opentelemetry/exporter-trace-otlp-http \
    @opentelemetry/resources \
    @opentelemetry/semantic-conventions
```

### Basic OpenTelemetry Setup

```javascript
// src/tracing/otel-setup.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

function initializeTracing(serviceName, serviceVersion = '1.0.0') {
    // Configure the OTLP exporter to send traces to your collector
    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    // Define resource attributes that identify this service
    const resource = new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
        environment: process.env.NODE_ENV || 'development',
    });

    // Create and configure the SDK
    const sdk = new NodeSDK({
        resource,
        traceExporter,
        instrumentations: [
            getNodeAutoInstrumentations({
                // Customize which instrumentations to enable
                '@opentelemetry/instrumentation-fs': {
                    enabled: false, // Disable filesystem tracing (too noisy)
                },
                '@opentelemetry/instrumentation-http': {
                    enabled: true,
                },
                '@opentelemetry/instrumentation-express': {
                    enabled: true,
                },
            }),
        ],
    });

    // Start the SDK
    sdk.start();

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => console.log('Tracing terminated'))
            .catch((error) => console.error('Error terminating tracing', error))
            .finally(() => process.exit(0));
    });

    return sdk;
}

module.exports = { initializeTracing };
```

### Creating Custom Spans

Auto-instrumentation handles HTTP and database calls, but you may want to trace custom operations:

```javascript
// src/services/payment-service.js
const { trace, SpanStatusCode } = require('@opentelemetry/api');

// Get a tracer for this module
const tracer = trace.getTracer('payment-service');

async function processPayment(orderId, amount, currency) {
    // Create a custom span for the payment processing
    return tracer.startActiveSpan('process-payment', async (span) => {
        // Add attributes to the span
        span.setAttribute('payment.order_id', orderId);
        span.setAttribute('payment.amount', amount);
        span.setAttribute('payment.currency', currency);

        try {
            // Validate payment details
            await tracer.startActiveSpan('validate-payment', async (validateSpan) => {
                validateSpan.setAttribute('validation.type', 'pre-authorization');
                await validatePaymentDetails(orderId, amount);
                validateSpan.end();
            });

            // Process with payment gateway
            const result = await tracer.startActiveSpan('gateway-request', async (gatewaySpan) => {
                gatewaySpan.setAttribute('gateway.name', 'stripe');
                const response = await callPaymentGateway(orderId, amount, currency);
                gatewaySpan.setAttribute('gateway.transaction_id', response.transactionId);
                gatewaySpan.end();
                return response;
            });

            span.setAttribute('payment.transaction_id', result.transactionId);
            span.setStatus({ code: SpanStatusCode.OK });

            return result;
        } catch (error) {
            // Record the error on the span
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
            throw error;
        } finally {
            span.end();
        }
    });
}

async function validatePaymentDetails(orderId, amount) {
    // Validation logic
    if (amount <= 0) {
        throw new Error('Invalid payment amount');
    }
    return true;
}

async function callPaymentGateway(orderId, amount, currency) {
    // Simulate gateway call
    return {
        transactionId: `txn_${Date.now()}`,
        status: 'completed'
    };
}

module.exports = { processPayment };
```

### Linking Traces to Logs

OpenTelemetry trace context can be added to your existing logger:

```javascript
// src/tracing/otel-logger.js
const { trace, context } = require('@opentelemetry/api');

class OtelTracedLogger {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }

    _getTraceContext() {
        const activeSpan = trace.getSpan(context.active());

        if (activeSpan) {
            const spanContext = activeSpan.spanContext();
            return {
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
                traceFlags: spanContext.traceFlags,
            };
        }

        return {};
    }

    _formatMessage(level, message, extra = {}) {
        const traceContext = this._getTraceContext();

        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            ...traceContext,
            ...extra,
        });
    }

    info(message, extra) {
        console.log(this._formatMessage('info', message, extra));
    }

    error(message, extra) {
        console.error(this._formatMessage('error', message, extra));
    }

    warn(message, extra) {
        console.warn(this._formatMessage('warn', message, extra));
    }

    debug(message, extra) {
        console.debug(this._formatMessage('debug', message, extra));
    }
}

module.exports = { OtelTracedLogger };
```

## Part 6: Correlating Traces Across Services

When multiple services handle a request, you need to see the complete picture. Here is how to set up correlation.

### Service A: API Gateway

```javascript
// services/api-gateway/src/index.js
const express = require('express');
const { initializeTracing } = require('./tracing/otel-setup');
const { OtelTracedLogger } = require('./tracing/otel-logger');

// Initialize tracing before importing other modules
initializeTracing('api-gateway', '1.0.0');

const logger = new OtelTracedLogger('api-gateway');
const app = express();

app.use(express.json());

app.post('/api/orders', async (req, res) => {
    logger.info('Received order request', { customerId: req.body.customerId });

    try {
        // Call order service - trace context is automatically propagated
        const orderResponse = await fetch('http://order-service:3001/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });

        const order = await orderResponse.json();
        logger.info('Order created successfully', { orderId: order.id });

        res.json(order);
    } catch (error) {
        logger.error('Order creation failed', { error: error.message });
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.listen(3000, () => {
    logger.info('API Gateway started on port 3000');
});
```

### Service B: Order Service

```javascript
// services/order-service/src/index.js
const express = require('express');
const { initializeTracing } = require('./tracing/otel-setup');
const { OtelTracedLogger } = require('./tracing/otel-logger');
const { trace } = require('@opentelemetry/api');

// Initialize tracing before importing other modules
initializeTracing('order-service', '1.0.0');

const logger = new OtelTracedLogger('order-service');
const tracer = trace.getTracer('order-service');
const app = express();

app.use(express.json());

app.post('/orders', async (req, res) => {
    logger.info('Processing order', { customerId: req.body.customerId });

    return tracer.startActiveSpan('create-order', async (span) => {
        try {
            // Create order in database
            const order = await createOrderInDatabase(req.body);
            span.setAttribute('order.id', order.id);

            // Call payment service
            logger.info('Initiating payment', { orderId: order.id });
            const paymentResponse = await fetch('http://payment-service:3002/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    amount: order.total,
                    currency: 'USD',
                }),
            });

            const payment = await paymentResponse.json();
            span.setAttribute('payment.transaction_id', payment.transactionId);

            logger.info('Order completed', { orderId: order.id, transactionId: payment.transactionId });

            span.end();
            res.json({ ...order, payment });
        } catch (error) {
            span.recordException(error);
            span.end();
            logger.error('Order processing failed', { error: error.message });
            res.status(500).json({ error: 'Failed to process order' });
        }
    });
});

async function createOrderInDatabase(orderData) {
    // Simulate database insert
    return {
        id: `order_${Date.now()}`,
        customerId: orderData.customerId,
        items: orderData.items,
        total: orderData.items.reduce((sum, item) => sum + item.price, 0),
        createdAt: new Date().toISOString(),
    };
}

app.listen(3001, () => {
    logger.info('Order Service started on port 3001');
});
```

### Service C: Payment Service

```javascript
// services/payment-service/src/index.js
const express = require('express');
const { initializeTracing } = require('./tracing/otel-setup');
const { OtelTracedLogger } = require('./tracing/otel-logger');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

// Initialize tracing before importing other modules
initializeTracing('payment-service', '1.0.0');

const logger = new OtelTracedLogger('payment-service');
const tracer = trace.getTracer('payment-service');
const app = express();

app.use(express.json());

app.post('/payments', async (req, res) => {
    const { orderId, amount, currency } = req.body;
    logger.info('Processing payment', { orderId, amount, currency });

    return tracer.startActiveSpan('process-payment', async (span) => {
        span.setAttribute('payment.order_id', orderId);
        span.setAttribute('payment.amount', amount);
        span.setAttribute('payment.currency', currency);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 100));

            const transactionId = `txn_${Date.now()}`;
            span.setAttribute('payment.transaction_id', transactionId);
            span.setStatus({ code: SpanStatusCode.OK });

            logger.info('Payment completed', { orderId, transactionId });

            span.end();
            res.json({
                transactionId,
                status: 'completed',
                orderId,
                amount,
                currency,
            });
        } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.end();

            logger.error('Payment failed', { orderId, error: error.message });
            res.status(500).json({ error: 'Payment processing failed' });
        }
    });
});

app.listen(3002, () => {
    logger.info('Payment Service started on port 3002');
});
```

## Part 7: Viewing and Analyzing Traces

Once you have tracing in place, you need a way to visualize and analyze the data.

### Local Development with Jaeger

Jaeger provides a complete tracing backend for local development:

```yaml
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

Start Jaeger and configure your services to export traces:

```bash
docker-compose up -d jaeger

# Set environment variable for your Node.js services
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Querying Traces

With your traces in Jaeger or another backend, you can:

1. Search by trace ID to see a complete request flow
2. Filter by service name to see all traces for a specific service
3. Find slow operations by sorting by duration
4. Identify error patterns by filtering for failed spans

### Sample Trace Output

A complete trace for an order creation looks like this:

```
Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736

api-gateway (50ms total)
├── POST /api/orders (50ms)
│   └── HTTP POST order-service:3001/orders (45ms)

order-service (45ms total)
├── POST /orders (45ms)
│   ├── create-order (40ms)
│   │   ├── database insert (5ms)
│   │   └── HTTP POST payment-service:3002/payments (30ms)

payment-service (30ms total)
├── POST /payments (30ms)
│   └── process-payment (25ms)
│       └── gateway-request (20ms)
```

## Best Practices

### 1. Keep Span Names Consistent

Use a naming convention that makes filtering easy:

```javascript
// Good span names
'http.request'
'db.query'
'cache.get'
'payment.process'

// Avoid dynamic values in span names
// Bad: `get-user-${userId}`
// Good: span named 'get-user' with attribute user.id = userId
```

### 2. Add Meaningful Attributes

```javascript
span.setAttribute('user.id', userId);
span.setAttribute('order.item_count', items.length);
span.setAttribute('cache.hit', cacheHit);
span.setAttribute('db.statement', 'SELECT * FROM users WHERE id = ?');
```

### 3. Handle Errors Properly

```javascript
try {
    await riskyOperation();
} catch (error) {
    span.recordException(error);
    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
    });
    throw error;
}
```

### 4. Sample in Production

High-traffic services cannot trace every request. Configure sampling:

```javascript
const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
    // Sample 10% of traces in production
    sampler: new TraceIdRatioBasedSampler(0.1),
    // ... other config
});
```

## Summary

Request tracing transforms debugging from guesswork into systematic investigation. Start with the basics - generate unique IDs, propagate them in headers, and include them in logs. When you need more power, OpenTelemetry provides automatic instrumentation and integration with observability platforms.

The key components are:

- **Trace ID generation**: UUIDs or OpenTelemetry's 32-character hex format
- **AsyncLocalStorage**: Maintains context across async operations
- **Header propagation**: Passes trace context between services
- **Structured logging**: Includes trace IDs in every log entry
- **OpenTelemetry**: Industry-standard tooling for production systems

With these pieces in place, you can follow any request through your entire system, find bottlenecks, and debug issues in minutes rather than hours.
