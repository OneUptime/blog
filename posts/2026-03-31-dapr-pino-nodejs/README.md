# How to Use Dapr with Pino in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pino, Node.js, Logging, Performance

Description: Integrate Pino, the high-performance Node.js logger, with Dapr services to achieve low-overhead structured logging with distributed trace context propagation.

---

## Why Pino for Dapr Node.js Services?

Pino is significantly faster than Winston and Bunyan due to its approach of minimizing work in the hot path - in-process serialization is kept minimal, and I/O is offloaded to a worker thread when transports are configured. For high-throughput Dapr microservices handling thousands of pub/sub events per second, Pino's performance advantage is measurable.

```bash
# Install Pino and Dapr SDK
npm install @dapr/dapr pino pino-pretty pino-http
```

## Basic Pino Logger Setup

```javascript
// logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: process.env.DAPR_APP_ID || 'unknown',
    pid: process.pid
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

module.exports = logger;
```

## Express App with Pino HTTP Middleware

```javascript
// server.js
const express = require('express');
const pinoHttp = require('pino-http');
const { DaprClient } = require('@dapr/dapr');
const logger = require('./logger');

const app = express();
const daprClient = new DaprClient();

// Pino HTTP middleware with Dapr header extraction
app.use(pinoHttp({
  logger,
  customProps: (req, res) => ({
    traceId: extractTraceId(req.headers['traceparent']),
    callerAppId: req.headers['dapr-app-id'] || 'external',
    daprRequestId: req.headers['x-request-id'] || ''
  }),
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} completed`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} failed: ${err.message}`
}));

app.use(express.json());

app.post('/api/inventory/update', async (req, res) => {
  const { productId, quantity, operation } = req.body;

  req.log.info({ productId, quantity, operation }, 'Updating inventory');

  try {
    const current = await daprClient.state.get('statestore', `inv-${productId}`);
    const newQty = operation === 'add'
      ? (current?.quantity || 0) + quantity
      : (current?.quantity || 0) - quantity;

    await daprClient.state.save('statestore', [
      { key: `inv-${productId}`, value: { productId, quantity: newQty } }
    ]);

    req.log.info({ productId, newQuantity: newQty }, 'Inventory updated');
    res.json({ productId, quantity: newQty });
  } catch (err) {
    req.log.error({ err, productId }, 'Inventory update failed');
    res.status(500).json({ error: err.message });
  }
});

function extractTraceId(traceParent) {
  if (!traceParent) return null;
  const parts = traceParent.split('-');
  return parts.length >= 2 ? parts[1] : null;
}

app.listen(3000, () => logger.info('Dapr service listening on port 3000'));
```

## Pino Child Logger for Pub/Sub Handlers

```javascript
// pubsub-handler.js
const { DaprServer } = require('@dapr/dapr');
const logger = require('./logger');

const server = new DaprServer({ serverPort: '3001' });

server.pubsub.subscribe('pubsub', 'payment-events', async (data, headers) => {
  // Create a child logger with event context
  // Note: CloudEvents attributes (id, source, type) are not available in headers
  // with the default Dapr JS SDK pub/sub callback. Use data fields for context.
  const eventLog = logger.child({
    traceId: extractTraceId(headers['traceparent']),
    paymentId: data.paymentId,
    orderId: data.orderId
  });

  const start = Date.now();
  eventLog.info('Processing payment event');

  try {
    await processPayment(data);

    eventLog.info(
      { durationMs: Date.now() - start },
      'Payment event processed'
    );
  } catch (err) {
    eventLog.error(
      { err, durationMs: Date.now() - start },
      'Payment event processing failed'
    );
    throw err;
  }
});

server.start();
logger.info('Pub/sub server started');
```

## Pino with Async Context for Trace Propagation

```javascript
// async-context-logger.js
const { AsyncLocalStorage } = require('async_hooks');
const pino = require('pino');

const asyncLocalStorage = new AsyncLocalStorage();
const baseLogger = pino({ level: 'info' });

const logger = {
  info: (obj, msg) => {
    const context = asyncLocalStorage.getStore() || {};
    baseLogger.info({ ...context, ...obj }, msg);
  },
  error: (obj, msg) => {
    const context = asyncLocalStorage.getStore() || {};
    baseLogger.error({ ...context, ...obj }, msg);
  },
  runWithContext: (context, fn) => asyncLocalStorage.run(context, fn)
};

module.exports = logger;
```

## Summary

Pino's low-overhead architecture makes it ideal for high-throughput Dapr services where logging should not add latency to event processing. Using `pino-http` middleware automatically enriches every request log with Dapr headers, while child loggers carry event-specific context through pub/sub handlers. The `pino-pretty` transport enables human-readable output during development while production uses fast JSON serialization.
