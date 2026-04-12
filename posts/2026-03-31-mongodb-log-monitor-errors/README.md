# How to Log and Monitor MongoDB Errors in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Monitoring, Observability, Node.js

Description: Learn how to implement structured error logging for MongoDB operations, track error rates with metrics, and set up alerting for critical database failures.

---

## Structured Logging for MongoDB Errors

Ad-hoc `console.error` calls produce logs that are hard to search, correlate, and alert on. Use a structured logger (Winston or Pino) to capture MongoDB errors with consistent fields that can be queried in log aggregation systems.

```bash
npm install winston
```

```javascript
// lib/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/var/log/app/errors.log', level: 'error' })
  ]
});

module.exports = logger;
```

## MongoDB Error Middleware

Centralize MongoDB error logging with a wrapper function:

```javascript
// lib/mongoLogger.js
const logger = require('./logger');

function logMongoError(err, context = {}) {
  const errorData = {
    message: err.message,
    errorCode: err.code,
    errorLabel: err.errorLabels,
    collection: context.collection,
    operation: context.operation,
    filter: context.filter ? JSON.stringify(context.filter) : undefined,
    mongoErrorType: err.constructor.name,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  };

  // Classify error severity
  const transientCodes = new Set([6, 7, 89, 91, 189, 216, 10107]);
  const isTransient = transientCodes.has(err.code);
  const isAuthError = [18, 13].includes(err.code);

  if (isAuthError) {
    logger.error({ ...errorData, category: 'auth', alert: true });
  } else if (isTransient) {
    logger.warn({ ...errorData, category: 'transient' });
  } else {
    logger.error({ ...errorData, category: 'application' });
  }
}

async function withMongoLogging(operation, context) {
  try {
    return await operation();
  } catch (err) {
    logMongoError(err, context);
    throw err;
  }
}

module.exports = { logMongoError, withMongoLogging };
```

## Tracking Error Metrics with Prometheus

Use `prom-client` to expose MongoDB error counters for Prometheus scraping:

```bash
npm install prom-client
```

```javascript
// metrics/mongoMetrics.js
const client = require('prom-client');

const mongoErrorCounter = new client.Counter({
  name: 'mongodb_errors_total',
  help: 'Total MongoDB errors by error code and category',
  labelNames: ['error_code', 'category', 'collection', 'operation']
});

const mongoOperationDuration = new client.Histogram({
  name: 'mongodb_operation_duration_ms',
  help: 'MongoDB operation duration in milliseconds',
  labelNames: ['collection', 'operation', 'status'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

async function trackedOperation(collection, operation, fn) {
  const timer = mongoOperationDuration.startTimer({ collection, operation });
  try {
    const result = await fn();
    timer({ status: 'success' });
    return result;
  } catch (err) {
    timer({ status: 'error' });
    mongoErrorCounter.inc({
      error_code: String(err.code || 'unknown'),
      category: err.constructor.name,
      collection,
      operation
    });
    throw err;
  }
}

module.exports = { mongoErrorCounter, mongoOperationDuration, trackedOperation };
```

## MongoDB Driver Event Listeners

The MongoDB Node.js driver emits connection pool events that help monitor health:

```javascript
const { MongoClient } = require('mongodb');
const logger = require('./lib/logger');

const client = new MongoClient(process.env.MONGODB_URI, {
  monitorCommands: true
});

// Monitor connection pool
client.on('connectionPoolCreated', (e) =>
  logger.info({ event: 'mongo.pool.created', address: e.address })
);

client.on('connectionPoolClosed', (e) =>
  logger.info({ event: 'mongo.pool.closed', address: e.address })
);

client.on('connectionCheckOutFailed', (e) => {
  logger.error({ event: 'mongo.pool.checkout_failed', reason: e.reason });
});

// Monitor slow commands
client.on('commandSucceeded', (e) => {
  if (e.duration > 1000) {
    logger.warn({
      event: 'mongo.slow_command',
      commandName: e.commandName,
      durationMs: e.duration
    });
  }
});

client.on('commandFailed', (e) => {
  logger.error({
    event: 'mongo.command_failed',
    commandName: e.commandName,
    failure: e.failure?.message,
    durationMs: e.duration
  });
});
```

## Alerting with OneUptime

Connect MongoDB error metrics to OneUptime alerts by configuring a metric monitor. Trigger a P1 alert when:
- `mongodb_errors_total` with `category=auth` increments (indicates credential or permission problem)
- Error rate exceeds 5% of operations in a 5-minute window
- Connection checkout failures appear (connection pool exhaustion)

Use the OneUptime metric alert API:

```bash
curl -X POST https://oneuptime.com/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"monitorType": "IncomingRequest", "name": "MongoDB Error Rate"}'
```

## Summary

Effective MongoDB error monitoring requires structured logging with consistent fields, centralized error classification by category and severity, Prometheus metrics for error counters and operation durations, and MongoDB driver event listeners for connection pool health. Alert on authentication errors immediately and on elevated error rates as early warning of degraded database health. Use OneUptime to correlate MongoDB error spikes with user-visible service degradation.
